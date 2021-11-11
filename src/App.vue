<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <v-btn
        text
        @click="() => { this.showHelpDialog = true; }"
      >
        <span class="mr-2">게임 방법</span>
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-show="isSignedIn"
        text
        @click="() => { this.showMyCouponDialog = true; }"
      >
        <span class="mr-2">내 쿠폰 보기</span>
      </v-btn>
      <v-btn
        text
        @click="isSignedIn ? onClickLogout() : onClickLogin()"
      >
        <span class="mr-2">{{ isSignedIn ? "로그아웃" : "로그인" }}</span>
      </v-btn>
      <v-dialog
          v-model="showLoginDialog"
          max-width="500px"
      >
        <v-card>
          <v-card-title>
            <span class="text-h5">로그인/등록</span>
          </v-card-title>
          <v-card-text>
            <v-container>
              <v-text-field
                  v-model="username"
                  label="게임 내 닉네임"
              ></v-text-field>
              <v-text-field
                  v-model="password"
                  label="쿠폰 확인용 암호"
                  type="password"
                  hint="본인 확인용입니다. 절대로 사용중인 비밀번호 넣지 마세요!"
              ></v-text-field>
            </v-container>
            <v-card-actions>
              <v-btn
                  color="blue darken-1"
                  text
                  @click="onClickRegister()"
              >
                등록
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn
                  color="blue darken-1"
                  text
                  @click="onClickClose()"
              >
                취소
              </v-btn>
              <v-btn
                  color="blue darken-1"
                  text
                  @click="onClickSignIn()"
              >
                로그인
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="showMyCouponDialog"
        scrollable
        max-width="500px"
      >
        <v-card>
          <v-card-title>
            <span class="text-h5">내 쿠폰</span>
          </v-card-title>
          <v-card-text>
            <v-list>
              <a
                  href="https://welfare.qookkagames.co.kr/barter#/"
                  target="_blank"
              >쿠폰 교환 사이트
              </a>
              <p v-if="userData.coupons.length === 0">쿠폰이 없습니다.</p>
              <v-list-item
                v-for="coupon in userData.coupons"
                :key="coupon.code">
                <v-list-item-content>
                  <v-list-item-title v-text="coupon.name"></v-list-item-title>
                  <v-list-item-title v-text="coupon.code"></v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                  color="blue darken-1"
                  text
                  @click="() => { this.showMyCouponDialog = false; }"
              >
                닫기
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
          v-model="showHelpDialog"
          scrollable
          max-width="500px"
      >
        <v-card>
          <v-card-title>
            <span class="text-h5">게임 방법</span>
          </v-card-title>
          <v-card-text>
            1. 각 쿠폰마다 3번씩의 뽑기 기회가 있습니다.<br>
            2. 당첨이 되면 해당 쿠폰은 더 이상 뽑을 수 없습니다.<br>
            3. 쿠폰 수량이 소진되면 더 이상 뽑을 수 없습니다.<br>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                  color="blue darken-1"
                  text
                  @click="() => { this.showHelpDialog = false; }"
              >
                닫기
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-app-bar>
    <v-main>
      <Home/>
    </v-main>
  </v-app>
</template>

<script>
import Home from '@/views/Home';
import firestore from '@/services/firestore';
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'App',
  components: {
    Home,
  },
  data: () => ({
    showLoginDialog: false,
    username: '',
    password: '',
    showMyCouponDialog: false,
    showHelpDialog: false,
  }),
  computed: {
    ...mapGetters([
      'isSignedIn',
      'userData'
    ]),
  },
  methods: {
    ...mapActions([
      'signIn',
      'signOut',
    ]),
    onClickLogin: function () {
      this.showLoginDialog = true;
    },
    onClickLogout: function () {
      this.signOut();
    },
    /* LoginDialog */
    getUserByUsername: async function (username) {
      const querySnapshot = await firestore.collection('Users')
          .where('username', '==', username)
          .get();
      if (querySnapshot.docs.length > 0) {
        return querySnapshot.docs[0];
      }
      return null;
    },
    onClickSignIn: async function () {
      const userDoc = await this.getUserByUsername(this.username);
      if (!userDoc) {
        alert("등록되지 않은 사용자입니다. 등록부터 하셔야 합니다.");
        return;
      }
      const { password } = userDoc.data();
      if (password !== this.password) {
        alert("확인코드가 맞지 않습니다. 다시 한번 확인해 주세요.");
        return;
      }
      this.signIn({
        id: userDoc.id,
        username: userDoc.data().username,
        coupons: userDoc.data().coupons
      });
      this.onClickClose();
    },
    onClickClose: function () {
      this.showLoginDialog = false;
    },
    validateUsername: async function (username) {
      const querySnapshot = await firestore.collection('ValidateUsers')
          .where('username', '==', username)
          .get();
      return querySnapshot.docs.length > 0;
    },
    onClickRegister: async function () {
      const userDoc = await this.getUserByUsername(this.username);
      if (userDoc && userDoc.exists) {
        alert("이미 등록되었습니다. 확인코드를 잊으신 경우 관리자에게 문의하세요.");
        return;
      }
      const validate = await this.validateUsername(this.username);
      if (!validate) {
        alert("삼별초 동맹원만 참여가 가능합니다. 동맹원일 경우 관리자에게 문의해 주세요.");
        return;
      }
      await firestore.collection('Users')
        .add({
          username: this.username,
          password: this.password,
          coupons: [],
        });
      const newUserDoc = await this.getUserByUsername(this.username);
      this.signIn({
        id: newUserDoc.id,
        username: newUserDoc.data().username,
        coupons: newUserDoc.data().coupons
      });
      this.onClickClose();
    }
  }
};
</script>
