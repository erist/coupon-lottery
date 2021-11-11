<template>
  <v-container>
    <v-row dense>
      <v-col
        v-for="coupon in coupons"
        :key="coupon.name"
        :cols="12"
      >
        <v-card>
          <v-card-title>
            <span class="text-h8">{{ coupon.name }}</span>
          </v-card-title>
          <v-card-text>
            <v-container>
              <span class="text-h5 red--text">남은 수량: {{ coupon.code.length }}</span><br>
              <span class="text-h5 blue--text">확률: {{ getProbability(coupon.code.length) }}%</span>
            </v-container>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                  color="blue darken-1"
                  text
                  @click="onClickDraw(coupon)"
              >
                뽑기
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog
        v-model="showDrawConfirmDialog"
        max-width="500px"
    >
      <v-card>
        <v-card-title>
          <span class="text-h5">뽑기 확인</span>
        </v-card-title>
        <v-card-text>
          <span class="text-h7">정말 도전하시겠습니까?</span>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                color="blue darken-1"
                text
                @click="onClickCancel()"
            >
              취소
            </v-btn>
            <v-btn
                color="blue darken-1"
                text
                @click="onClickDrawConfirm()"
            >
              확인
            </v-btn>
          </v-card-actions>
          <v-overlay
            :value="showSpinner"
            absolute
          >
            <v-progress-circular
                v-if="showSpinner"
                :size="50"
                color="primary"
                indeterminate
            ></v-progress-circular>
          </v-overlay>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import firestore from '@/services/firestore';
import { mapGetters, mapActions } from 'vuex'

export default {
  name: "Home",
  data: () => ({
    totalUsers: 0,
    coupons: [],
    showDrawConfirmDialog: false,
    showSpinner: false,
    drawingCoupon: {},
  }),
  created: async function () {
    const [allUsersSnapshot, couponsSnapshot] = await Promise.all([
      firestore.collection('ValidateUsers').get(),
      firestore.collection('Coupons').get(),
    ]);
    this.totalUsers = allUsersSnapshot.docs.length;
    this.coupons = couponsSnapshot.docs.map(doc => {
      const { name, code } = doc.data();
      return {
        id: doc.id,
        name,
        code,
      };
    });
  },
  computed: {
    ...mapGetters([
      'isSignedIn',
      'userData'
    ]),
  },
  methods: {
    ...mapActions([
      'setCoupons'
    ]),
    getProbability: function (count) {
      if (this.totalUsers) {
        return (count / this.totalUsers * 100).toFixed(2);
      }
      return 0;
    },
    getChance: async function (couponDocId) {
      const querySnapshot = await firestore.collection('Draws')
        .where('userDocId', '==', this.userData.id)
        .where('couponDocId', '==', couponDocId)
        .get();
      return querySnapshot.docs.length < process.env.VUE_APP_DRAW_CHANCE;
    },
    onClickDraw: function (coupon) {
      if (this.userData.id.length === 0) {
        alert("먼저 게임 닉네임으로 로그인 하셔야 합니다.");
        return;
      }
      this.drawingCoupon = Object.assign({}, coupon);
      this.showDrawConfirmDialog = true;
    },
    onClickCancel: function () {
      this.drawingCoupon = Object.assign({}, {});
      this.showDrawConfirmDialog = false;
      this.showSpinner = false;
    },
    draw: async function () {
      const couponDocRef = firestore.collection('Coupons').doc(this.drawingCoupon.id);
      const userDocRef = firestore.collection('Users').doc(this.userData.id);
      const drawDocRef = await firestore.collection('Draws').add({
        userDocId: this.userData.id,
        username: this.userData.username,
        couponDocId: this.drawingCoupon.id,
        timestamp: Date.now()
      });
      const couponDoc = await couponDocRef.get();
      const p = couponDoc.data().code.length / this.totalUsers * 10000;
      const d = Math.random() * (10000 - 1) + 1;
      const result = p > d;
      const result = true;
      await firestore.runTransaction(async (t) => {
        let task = [];
        if (result) {
          const [userDoc, couponDoc] = await Promise.all([
            t.get(userDocRef),
            t.get(couponDocRef)
          ]);
          const { name: couponName, code: couponCodes } = couponDoc.data();
          const userCoupons = [...userDoc.data().coupons, {
            docId: couponDoc.id,
            name: couponName,
            code: couponCodes.pop()
          }];
          task = [...task,
            t.update(drawDocRef, { pass: 'success' }),
            t.update(userDocRef, { coupons: userCoupons }),
            t.update(couponDocRef, { code: couponCodes })
          ];
        } else {
          task = [...task,
            t.update(drawDocRef, { pass: 'failure' })
          ];
        }
        await Promise.all(task);
      });
      return result;

    },
    onClickDrawConfirm: async function () {
      this.showSpinner = true;

      const couponDoc = await firestore.collection('Coupons').doc(this.drawingCoupon.id).get();
      if (couponDoc.data().code.length === 0) {
        alert("쿠폰이 모두 소진되었습니다.");
        this.showSpinner = false;
        return;
      }
      const hasChance = await this.getChance(this.drawingCoupon.id);
      if (!hasChance) {
        alert("모든 뽑기 기회가 소진되었습니다.");
        this.showSpinner = false;
        return;
      }
      const alreadySuccess = this.userData.coupons.filter(coupon => coupon.docId === this.drawingCoupon.id);
      if (alreadySuccess.length > 0) {
        alert("이미 당첨된 쿠폰입니다.");
        this.showSpinner = false;
        return;
      }
      const result = await this.draw();
      if (!result) {
        alert("꽝! 아쉽게도 당첨되지 못했습니다.");
      } else {
        const userDoc = await firestore.collection('Users').doc(this.userData.id).get();
        this.setCoupons({
          coupons: userDoc.data().coupons
        });
        alert("축하합니다! 내 쿠폰 보기에서 확인해주세요.");
      }
      this.showSpinner = false;
      this.onClickCancel();
    }
  }
}
</script>
