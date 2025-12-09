/**
 * 设置视图组件
 * LLM 配置和应用设置
 */

import React, { useState, useEffect } from "react";
import {
  useConfigStore,
  getProviderDisplayName,
  getProviderDefaultModel,
  getProviderDocUrl,
} from "../stores";
import type { LLMConfig } from "@/shared/types/config";
import { formatSize } from "@/shared/utils/text-utils";
import { MessageType } from "@/shared/types/messages";

type LLMProvider = LLMConfig["provider"];

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "deepseek", label: "DeepSeek（推荐，性价比高）" },
  { value: "openai", label: "OpenAI (GPT-4o-mini)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "custom", label: "自定义 OpenAI 兼容 API" },
];

export function SettingsView() {
  const {
    llmConfig,
    storageUsage,
    isTesting,
    testResult,
    fetchConfig,
    setLLMConfig,
    testConnection,
    fetchStorageUsage,
    clearTestResult,
  } = useConfigStore();

  // 表单状态
  const [provider, setProvider] = useState<LLMProvider>(
    llmConfig?.provider || "deepseek"
  );
  const [apiKey, setApiKey] = useState(llmConfig?.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(llmConfig?.baseUrl || "");
  const [modelName, setModelName] = useState(llmConfig?.modelName || "");
  const [showApiKey, setShowApiKey] = useState(false);

  // 初始化
  useEffect(() => {
    fetchConfig();
    fetchStorageUsage();
  }, []);

  // 同步配置到表单
  useEffect(() => {
    if (llmConfig) {
      setProvider(llmConfig.provider);
      setApiKey(llmConfig.apiKey);
      setBaseUrl(llmConfig.baseUrl || "");
      setModelName(llmConfig.modelName || "");
    }
  }, [llmConfig]);

  // 切换服务商时重置模型名称
  useEffect(() => {
    if (provider !== "custom") {
      setModelName(getProviderDefaultModel(provider));
    }
  }, [provider]);

  // 测试连接
  const handleTest = async () => {
    clearTestResult();
    await testConnection({
      provider,
      apiKey,
      baseUrl: provider === "custom" ? baseUrl : undefined,
      modelName: provider === "custom" ? modelName : undefined,
    });
  };

  // 保存配置
  const handleSave = async () => {
    await setLLMConfig({
      provider,
      apiKey,
      baseUrl: provider === "custom" ? baseUrl : undefined,
      modelName: provider === "custom" ? modelName : undefined,
    });
    alert("配置已保存");
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.EXPORT_DATA,
      });

      if (response.success) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `demand-radar-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败");
    }
  };

  // 清空数据
  const handleClearData = async () => {
    if (!confirm("确定要清空所有数据吗？此操作不可恢复！")) {
      return;
    }
    if (!confirm("再次确认：这将删除所有保存的产品方向和分析记录！")) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: MessageType.CLEAR_DATA,
      });
      await fetchStorageUsage();
      alert("数据已清空");
    } catch (error) {
      console.error("Clear data failed:", error);
      alert("清空失败");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-6">
        {/* LLM 配置 */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>🤖</span> LLM 配置
          </h2>

          <div className="space-y-4">
            {/* 服务商选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                服务商
              </label>
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      provider === p.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={provider === p.value}
                      onChange={() => setProvider(p.value)}
                      className="text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  API Key <span className="text-red-500">*</span>
                </label>
                {getProviderDocUrl(provider) && (
                  <a
                    href={getProviderDocUrl(provider)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    获取 Key →
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 自定义服务商配置 */}
            {provider === "custom" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* 测试结果 */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  testResult === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult === "success" ? "✅ 连接成功！" : "❌ 连接失败，请检查配置"}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={!apiKey || isTesting}
                className="flex-1 py-2 px-4 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? "测试中..." : "测试连接"}
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKey}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存配置
              </button>
            </div>
          </div>
        </section>

        {/* 存储管理 */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>💾</span> 存储管理
          </h2>

          {storageUsage && (
            <div className="space-y-3">
              {/* 使用量进度条 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">已使用</span>
                  <span className="text-gray-900">
                    {formatSize(storageUsage.used)} / {formatSize(storageUsage.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      storageUsage.percentage >= 0.9
                        ? "bg-red-500"
                        : storageUsage.percentage >= 0.7
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(storageUsage.percentage * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(storageUsage.percentage * 100)}% 已使用
                </div>
              </div>

              {/* 存储操作 */}
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex-1 py-2 px-4 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  📤 导出数据
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 py-2 px-4 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  🗑️ 清空数据
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 关于 */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>ℹ️</span> 关于
          </h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Demand Radar</strong> 是一个帮助你从用户讨论中发现产品机会的工具。
            </p>
            <p>
              支持 Reddit、知乎等平台，通过 AI 分析提炼可执行的产品方向。
            </p>
            <div className="pt-2 border-t text-xs text-gray-400">
              版本 1.0.0
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
