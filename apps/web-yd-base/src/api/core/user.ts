import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export interface YDUserInfo extends UserInfo {
  id: number;
  uuid: string;
  dept_id: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  homePath: string;
  avatar: string;
  status: number;
  is_superuser: boolean;
  is_staff: boolean;
  is_multi_login: boolean;
  join_time: string;
  last_login_time: string;
}
/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<YDUserInfo>('/sys/users/me');
}
