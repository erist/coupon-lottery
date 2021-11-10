import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    signedIn: false,
    id: '',
    username: '',
    coupons: [],
  },
  getters: {
    isSignedIn: function (state) {
      return state.signedIn;
    },
    userData: function (state) {
      return {
        id: state.id,
        username: state.username,
        coupons: state.coupons
      };
    }
  },
  mutations: {
    setSignedIn: function (state, payload) {
      state.id = payload.id;
      state.username = payload.username;
      state.coupons = payload.coupons;
      state.signedIn = true;
    },
    setSignedOut: function (state, /* payload */) {
      state.id = '';
      state.username = '';
      state.coupons = [];
      state.signedIn = false
    },

  },
  actions: {
    signIn: function ({ commit }, payload) {
      return commit('setSignedIn', payload);
    },
    signOut: function ({ commit }) {
      return commit('setSignedOut');
    }
  }
})
