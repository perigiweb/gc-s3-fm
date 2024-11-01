import {
  createRouter,
  createWebHistory
} from 'vue-router'

import { useAuth } from './stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/contact',
      component: () => import('./pages/contact/Index.vue'),
      name: 'contact',
      children: [
        {
          path: '',
          component: () => import('./pages/contact/ContactList.vue'),
          name: 'g-contacts',
          meta: {
            authRequired: true,
          },
        },
      ]
    },
    {
      path: '/s3',
      component: () => import('./pages/s3/Index.vue'),
      children: [
        {
          path: ':provider',
          component: () => import('./pages/s3/BucketList.vue'),
          name: 's3-buckets',
          meta: {
            authRequired: true,
          }
        },
        {
          path: ':provider/:bucket/:prefix*',
          component: () => import('./pages/s3/ObjectList.vue'),
          name: 's3-objects',
          meta: {
            authRequired: true,
          }
        },
        {
          path: '',
          component: () => import('./pages/s3/ProviderList.vue'),
          name: 's3-index'
        }
      ]
    },
    {
      path: '/authenticated',
      component: () => import('./pages/Authenticated.vue')
    },
    {
      path: '/:path(.*)',
      component: () => import('./pages/NotFound.vue'),
      name: 'notfound'
    },
    {
      path: '/',
      component: () => import('./pages/Home.vue'),
      name: 'home'
    }
  ]
})

router.beforeEach((to) => {
  const authRequired = to.meta.authRequired || false
  const { isLoggedIn } = useAuth()
  if (authRequired && !isLoggedIn.value){
    return (to.meta.redirectTo || '/')
  }
})

export default router