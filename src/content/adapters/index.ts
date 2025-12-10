import type { IPlatformAdapter, ExtractionResult } from "./base";
import { RedditAdapter } from "./reddit";
import { ZhihuAdapter } from "./zhihu";
import { TwitterAdapter } from "./twitter";
import { GenericAdapter } from "./generic";

/**
 * 适配器注册中心
 * 管理所有平台适配器，按优先级匹配
 */
class AdapterRegistry {
  private adapters: IPlatformAdapter[] = [];

  /**
   * 注册适配器
   */
  register(adapter: IPlatformAdapter): void {
    this.adapters.push(adapter);
  }

  /**
   * 根据 URL 获取匹配的适配器
   * 优先返回专用适配器，最后返回通用适配器
   */
  getAdapter(url: string): IPlatformAdapter {
    // 优先返回专用适配器
    for (const adapter of this.adapters) {
      if (adapter.getPlatformName() !== "generic" && adapter.canHandle(url)) {
        return adapter;
      }
    }

    // 降级到通用适配器
    const genericAdapter = this.adapters.find(
      (a) => a.getPlatformName() === "generic"
    );
    if (genericAdapter) {
      return genericAdapter;
    }

    // 如果没有通用适配器，创建一个
    const fallback = new GenericAdapter();
    this.register(fallback);
    return fallback;
  }

  /**
   * 检测当前页面的平台类型
   */
  detectPlatform(url: string): "reddit" | "zhihu" | "twitter" | "generic" {
    for (const adapter of this.adapters) {
      if (adapter.getPlatformName() !== "generic" && adapter.canHandle(url)) {
        return adapter.getPlatformName();
      }
    }
    return "generic";
  }

  /**
   * 获取所有已注册的适配器
   */
  getAll(): IPlatformAdapter[] {
    return [...this.adapters];
  }

  /**
   * 清空所有适配器
   */
  clear(): void {
    this.adapters = [];
  }
}

/**
 * 适配器注册中心单例
 */
export const adapterRegistry = new AdapterRegistry();

// 注册适配器（顺序决定优先级）
adapterRegistry.register(new RedditAdapter());
adapterRegistry.register(new ZhihuAdapter());
adapterRegistry.register(new TwitterAdapter());
adapterRegistry.register(new GenericAdapter());

// 导出类型和基类
export type { IPlatformAdapter, ExtractionResult };
export { BasePlatformAdapter } from "./base";
export { RedditAdapter } from "./reddit";
export { ZhihuAdapter } from "./zhihu";
export { TwitterAdapter } from "./twitter";
export { GenericAdapter } from "./generic";
