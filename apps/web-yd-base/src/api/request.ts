/**
 * 该文件可自行根据业务逻辑进行调整
 */
import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export interface HttpError {
  msg: string;
  code: number;
}
export interface HttpResponse<T = any> {
  msg: string;
  code: number;
  data: T;
}
function createRequestClient(baseURL: string) {
  const client = new RequestClient({
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // response数据解构
  client.addResponseInterceptor({
    fulfilled: (response) => {
      // Blob 类型直接返回
      if (response.config.responseType === 'blob') {
        return response;
      }

      // 直接提取状态吗和返回内容
      const { code }: { code: number } = response.data;
      const { data }: { data: HttpResponse } = response.data;

      console.warn('response.data', data);

      if (code === 401) {
        // TODO: token 监听，自动刷新，重新登录
      }

      return data;
    },
    rejected: (error) => {
      let res: HttpError = {
        code: 500,
        msg: '服务器响应异常，请稍后重试',
      };

      if (error.response) {
        res = error.response.data;
      }

      if (error.message === 'Network Error') {
        res.msg = '服务器连接异常，请稍后重试';
      }

      if (error.code === 'ECONNABORTED') {
        res.msg = '请求超时，请稍后重试';
      }

      message.error({
        content: `操作有误：${res.msg} `,
        duration: 3,
      });

      return Promise.reject(res);
    },
  });

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string) =>
      console.error(`Axios error: ${msg}`),
    ),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL);

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
