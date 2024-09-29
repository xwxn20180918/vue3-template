// axios配置  可自行根据项目进行更改，只需更改该文件即可，其他文件可以不动

import type { AxiosInstance, AxiosResponse } from 'axios';
import { clone } from 'lodash-es';
import axios from 'axios';
import type { AxiosTransform, CreateAxiosOptions } from './axiosTransform';
import type { RequestOptions, Result } from '@/types/axios';
import { VAxios } from './service';
import { ContentTypeEnum, RequestEnum } from '@/enums/httpEnum';
import { isString } from '@/utils/is';
import { formatRequestDate, joinTimestamp } from './helper';
import { setObjToUrlParams } from '@/utils';

// 白名单接口
const whiteList = ['/login', '/refresh-token'];

// 临时token
function getAccessToken() {
  return '';
}

/**
 * @description 数据处理，方便区分多种数据格式
 */
const transform: AxiosTransform = {
  /**
   * @param res
   * @param options
   * @description 处理相应数据，如果数据不是预期格式，可直接抛出错误
   */
  transformResponseHook(res: AxiosResponse<Result>, options: RequestOptions) {
    const { isTransformResponse, isReturnNativeResponse } = options;
    // 二进制数据不进行任何处理
    const { responseType } = res.request;
    if (
      ['arraybuffer', 'blob', 'document', 'json', 'text'].includes(responseType)
    )
      return res.data;
    // 是否返回原生响应头
    if (isReturnNativeResponse) return res;
    // 不进行任何处理，直接返回
    // 用于页面代码可能需要直接获取code，data，message这些信息时开启
    if (!isTransformResponse) return res.data;
    // 错误的时候返回
    const { data } = res;
    if (!data) {
      throw new Error('sys.api.apiRequestFailed');
    }
    return data;
  },

  /**
   * 在请求之前拦截，做一些处理
   * @param config
   * @param options
   */
  beforeRequestHook(config, options) {
    const {
      apiUrl,
      joinPrefix,
      joinParamsToUrl,
      formatDate,
      joinTime = true,
      urlPrefix
    } = options;
    if (joinPrefix) config.url = `${urlPrefix}${config.url}`;
    if (apiUrl && isString(apiUrl)) config.url = `${apiUrl}${config.url}`;
    const params = config.params || {};
    const data = config.data || false;
    formatDate && data && !isString(data) && formatRequestDate(data);
    if (config.method?.toUpperCase() === RequestEnum.GET) {
      if (!isString(params)) {
        // 给 get 请求加上时间戳参数，避免从缓存中拿数据。
        let url = `${config.url}?`;
        for (const propName of Object.keys(params)) {
          const value = params[propName];

          if (
            value !== void 0 &&
            value !== null &&
            typeof value !== 'undefined'
          ) {
            if (typeof value === 'object') {
              for (const val of Object.keys(value)) {
                const params = `${propName}[${val}]`;
                const subPart = `${encodeURIComponent(params)}=`;
                url += `${subPart + encodeURIComponent(value[val])}&`;
              }
            } else {
              url += `${propName}=${encodeURIComponent(value)}&`;
            }
          }
        }
        url = url.slice(0, -1);
        config.params = {};
        config.url = url;
      } else {
        // 兼容restful风格
        config.url = `${config.url + params}${joinTimestamp(joinTime, true)}`;
        config.params = undefined;
      }
    } else if (!isString(params)) {
      formatDate && formatRequestDate(params);
      if (
        Reflect.has(config, 'data') &&
        config.data &&
        (Object.keys(config.data).length > 0 || config.data instanceof FormData)
      ) {
        config.data = data;
        config.params = params;
      } else {
        // 非GET请求如果没有提供data，则将params视为data
        config.data = params;
        config.params = undefined;
      }
      if (joinParamsToUrl) {
        config.url = setObjToUrlParams(config.url as string, {
          ...config.params,
          ...config.data
        });
      }
    } else {
      // 兼容restful风格
      config.url += params;
      config.params = undefined;
    }
    return config;
  },

  /**
   * 在请求之后拦截，做一些处理
   * @param config
   * @param options
   */
  requestInterceptors(config, options) {
    // token拦截
    const b = whiteList.some(s => (config.url as string).includes(s));
    const token = getAccessToken();
    if (token && !b) {
      (config as Recordable).headers.Authorization =
        options.authenticationScheme
          ? `${options.authenticationScheme} ${token}`
          : token;
    }
    return config;
  },

  /**
   * 在响应之后拦截，做一些处理
   * @param res
   */
  responseInterceptors(res) {
    return res;
  },
  /**
   * 响应错误处理 目前简单处理
   * @param axiosInstance
   * @param error
   */
  responseInterceptorsCatch(axiosInstance, error) {
    const status = error?.response?.status;
    if (axios.isCancel(error)) return Promise.reject(error);
    if (status === 401) {
    }
    if (status === 403) {
    }
    return Promise.reject(error);
  }
};

function createAxios(opt?: Partial<CreateAxiosOptions>) {
  return new VAxios({
    ...{
      authenticationScheme: 'Bearer',
      timeout: 10 * 1000,
      headers: { 'Content-Type': ContentTypeEnum.JSON },
      // 数据处理
      transform: clone(transform),
      // 配置项，下面的选项都可以在独立的接口请求中覆盖
      requestOptions: {
        // 默认将prefix 添加到url
        joinPrefix: true,
        // 是否返回原生响应头 比如：需要获取响应头时使用该属性
        isReturnNativeResponse: false,
        // 需要对返回数据进行处理
        isTransformResponse: true,
        // post请求的时候添加参数到url
        joinParamsToUrl: false,
        // 格式化提交参数时间
        formatDate: true,
        // 消息提示类型
        errorMessageMode: 'message',
        // 接口地址
        apiUrl: import.meta.env.VITE_GLOB_API_URL,
        // 接口拼接地址
        urlPrefix: import.meta.env.VITE_GLOB_API_URL_PREFIX,
        //  是否加入时间戳
        joinTime: true,
        // 忽略重复请求
        ignoreCancelToken: true,
        // 是否携带token
        withToken: true,
        retryRequest: {
          isOpenRetry: true,
          count: 5,
          waitTime: 100
        }
      }
    },
    ...(opt || {})
  });
}

export const defHttp = createAxios();
