import { auth } from '@common/vue/plugins/fetch';
import { useMainStore } from '../store';

// const permissions = {
//   // g1 = route groups, g2 = user roles
//   // go through each route group... check if group matches [list of roles in user]
//   allowed: (g1, g2) => g1.find(x => g2.includes(x))
// }

// const routeGroups = {
//   // '/authors', '/categories', '/books', '/pages', '/books/:id/pages'
//   '/test': ['TestGroup'] //
// }

const { VITE_INITIAL_SECURE_PATH, VITE_INITIAL_PUBLIC_PATH } = import.meta.env;

export const authGuard = async (to, from, next) => {
  const store = useMainStore();

  const previouslyLoggedIn = async () => {
    try {
      const response = await auth.get('/api/auth/verify');
      if (response.status >= 200 && response.status < 400) {
        store.user = response.data.user;
        return true;
      }
    } catch (e) {
      // Token missing, expired, or invalid — fall through to redirect
    }
    return false;
  };

  // TODO find users from localStorage? // potential security leak
  // const item = localStorage.getItem('session') // survive a refresh - POTENTIAL SECURITY RISK - TO REVIEW AND CHANGE USE HTTPONLY COOKIES
  // if (item) {
  //   const user = JSON.parse(item)
  //   store.commit('setUser', user) // need user.token only
  // }

  const loggedIn = !!store.user;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // const { roles } = store.state.user
  // if (routeGroups[to.matched[0].path]) {
  //   let found = permissions.allowed(routeGroups[to.matched[0].path], roles.split(','))
  //   if (!found) {
  //     alert('Forbidden... Check Page Permissions')
  //     return next('/')
  //   }
  // }
  if (loggedIn === requiresAuth) {
    next();
  } else if (!loggedIn && requiresAuth) {
    const result = await previouslyLoggedIn();
    if (result) {
      next();
    } else {
      next(VITE_INITIAL_PUBLIC_PATH);
    }
  } else if (loggedIn && !requiresAuth) {
    next(VITE_INITIAL_SECURE_PATH);
  } else {
    // should not get here
    console.log('router should not get here', loggedIn, requiresAuth);
  }
};
