import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import axios from 'axios';
import qs from 'qs';
import { cloneDeep } from 'lodash-es';
import type { CreateAxiosOptions } from '@/config/axios/axiosTransform';
import { AxiosCanceler } from '@/config/axios/axiosCancel';
import { isFunction } from '@/utils/is';
import type { RequestOptions, Result } from '@/types/axios';
import { ContentTypeEnum, RequestEnum } from '@/enums/httpEnum';

// 请求队列
let requestList: any[] = [];
// 是否正在刷新中
let isRefreshToken = false;
// 临时获取token 后期放其他地方
function getRefreshToken() {
  return '';
}
// 临时获取刷新token 后期放其他地方
function refreshToken() {
  return '';
}

export class VAxios {
  private axiosInstance: AxiosInstance;

  private readonly options: CreateAxiosOptions;

  constructor(options: CreateAxiosOptions) {
    this.options = options;
    this.axiosInstance = axios.create(options);
    this.setupInterceptors();
  }

  private getTransform() {
    const { transform } = this.options;
    return transform;
  }

  /**
   * @description: Interceptor configuration 拦截器配置
   */
  private setupInterceptors() {
    const {
      axiosInstance,
      options: { transform }
    } = this;
    if (!transform) return;
    const {
      requestInterceptors,
      requestInterceptorsCatch,
      responseInterceptors,
      responseInterceptorsCatch
    } = transform;
    const axiosCanceler = new AxiosCanceler();

    // 请求拦截器配置处理
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const requestOptions =
          (config as any).requestOptions ?? this.options.requestOptions;
        const b = requestOptions?.ignoreCancelToken ?? true;
        !b && axiosCanceler.addPending(config);
        if (requestInterceptors && isFunction(requestInterceptors)) {
          config = requestInterceptors(config, this.options);
        }
        return config;
      },
      undefined
    );
    // 请求拦截器错误捕获
    requestInterceptorsCatch &&
      isFunction(responseInterceptorsCatch) &&
      this.axiosInstance.interceptors.request.use(
        undefined,
        requestInterceptorsCatch
      );
    // 响应拦截器配置处理
    this.axiosInstance.interceptors.response.use((res: AxiosResponse<any>) => {
      const { config } = res;
      if (res.data.code === 401) {
        // 如果未认证，并且未进行刷新令牌，说明可能是访问令牌过期了
        if (!isRefreshToken) {
          isRefreshToken = true;
          // 获取到刷新token的接口
          if (getRefreshToken()) {
            // 刷新token
            try {
              const token = refreshToken();
              // 缓存refreshToken 这一步后期做
              config.headers.Authorization = `Bearer ${token}`;
              for (const cb of requestList) {
                cb();
              }
              requestList = [];
              return new Promise(resolve => {
                resolve(this.axiosInstance(config));
              });
            } catch (err) {
              for (const cb of requestList) {
                cb();
              }
            } finally {
              requestList = [];
              isRefreshToken = false;
            }
          }
        } else {
          // 如果正在刷新令牌，则将请求添加到队列中
          return new Promise(resolve => {
            const refreshToken = getRefreshToken();
            requestList.push(() => {
              // 让每个请求携带自定义token 请根据实际情况自行修改
              config.headers.Authorization = `Bearer ${refreshToken}`;
              resolve(this.axiosInstance(config));
            });
          });
        }
      }
      res && axiosCanceler.removePending(res.config);
      if (responseInterceptors && isFunction(responseInterceptors)) {
        res = responseInterceptors(res);
      }
      return res;
    }, undefined);
  }

  // 支持表单数据
  supportFormData(config: AxiosRequestConfig) {
    const headers = config.headers || this.options.headers;
    const contentType = headers?.['Content-Type'] || headers?.['content-type'];

    if (
      contentType !== ContentTypeEnum.FORM_URLENCODED ||
      !Reflect.has(config, 'data') ||
      config.method?.toUpperCase() === RequestEnum.GET
    )
      return config;

    return {
      ...config,
      data: qs.stringify(config.data, { arrayFormat: 'brackets' })
    };
  }

  get<T = any>(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<T> {
    return this.request({ ...config, method: RequestEnum.GET }, options);
  }

  post<T = any>(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<T> {
    return this.request({ ...config, method: RequestEnum.POST }, options);
  }

  put<T = any>(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<T> {
    return this.request({ ...config, method: RequestEnum.PUT }, options);
  }

  delete<T = any>(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<T> {
    return this.request({ ...config, method: RequestEnum.DELETE }, options);
  }

  request<T = any>(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<T> {
    let conf: CreateAxiosOptions = cloneDeep(config);
    // cancelToken 如果被深拷贝，会导致最外层无法使用cancel方法来取消请求，所以需要手动赋值
    if (config.cancelToken) {
      conf.cancelToken = config.cancelToken;
    }
    if (config.signal) {
      conf.signal = config.signal;
    }
    const transform = this.getTransform();
    const { requestOptions } = this.options;
    const opt: RequestOptions = { ...requestOptions, ...options };
    const { beforeRequestHook, requestCatchHook, transformResponseHook } =
      transform || {};
    if (beforeRequestHook && isFunction(beforeRequestHook))
      conf = beforeRequestHook(conf, opt);
    conf.requestOptions = opt;
    conf = this.supportFormData(conf);
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .request<any, AxiosResponse<Result>>(conf)
        .then((res: AxiosResponse<Result>) => {
          if (transformResponseHook && isFunction(transformResponseHook)) {
            try {
              resolve(transformResponseHook(res, opt));
            } catch (err) {
              reject(err || new Error('request error!'));
            }
            return;
          }
          resolve(res as unknown as Promise<T>);
        })
        .catch((e: Error | AxiosError) => {
          if (requestCatchHook && isFunction(requestCatchHook)) {
            return reject(requestCatchHook(e, opt));
          }
          if (axios.isAxiosError(e)) {
            // 在此处重写来自 axios 的错误消息
          }
          reject(e);
        });
    });
  }
}
