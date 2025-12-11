/**
 * 设置视图组件
 * LLM 配置和应用设置
 */

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  useConfigStore,
  getProviderDisplayName,
  getProviderDefaultModel,
  getProviderDocUrl,
} from "../stores";
import { useConfirm } from "./ConfirmProvider";
import type { LLMConfig } from "@/shared/types/config";
import { formatSize } from "@/shared/utils/text-utils";
import { MessageType } from "@/shared/types/messages";

type LLMProvider = LLMConfig["provider"];

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "deepseek", label: "DeepSeek (推荐)" },
  { value: "openai", label: "OpenAI (GPT-4o-mini)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "custom", label: "自定义 OpenAI 兼容接口" },
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
  const { confirm } = useConfirm();

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

  // 切换服务商
  const handleProviderChange = (newProvider: LLMProvider) => {
    setProvider(newProvider);
    if (newProvider !== "custom") {
      setModelName(getProviderDefaultModel(newProvider));
    }
  };

  // 测试连接
  const handleTest = async () => {
    clearTestResult();
    await testConnection({
      provider,
      apiKey,
      baseUrl: provider === "custom" ? baseUrl : undefined,
      modelName, // 始终传递 modelName
    });
  };

  // 保存配置
  const handleSave = async () => {
    await setLLMConfig({
      provider,
      apiKey,
      baseUrl: provider === "custom" ? baseUrl : undefined,
      modelName, // 始终保存 modelName
    });
    toast.success("配置已保存");
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
      toast.error("导出失败");
    }
  };

  // 清空数据
  const handleClearData = async () => {
    const isConfirmed = await confirm({
      title: "清空所有数据",
      message: "确定要清空所有数据吗？这将永久删除所有保存的产品方向和分析记录！此操作不可恢复。",
      confirmText: "确定清空",
      isDestructive: true,
    });
    
    if (!isConfirmed) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: MessageType.CLEAR_DATA,
      });
      await fetchStorageUsage();
      toast.success("数据已清空");
    } catch (error) {
      console.error("Clear data failed:", error);
      toast.error("清空失败");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-10" />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* LLM Configuration Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🤖</span>
                <h2 className="font-semibold text-gray-900">LLM 配置</h2>
            </div>
          
            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                AI 服务商
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PROVIDERS.map((p) => (
                  <label
                    key={p.value}
                    className={`
                      relative flex items-center p-3 border rounded-xl cursor-pointer transition-all
                      ${provider === p.value
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 z-10"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={p.value}
                      checked={provider === p.value}
                      onChange={() => handleProviderChange(p.value)}
                      className="sr-only" 
                    />
                    <div className="flex-1 flex items-center justify-between">
                        <span className={`text-sm font-medium ${provider === p.value ? "text-blue-700" : "text-gray-700"}`}>
                            {p.label}
                        </span>
                        {provider === p.value && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                        )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  API Key <span className="text-red-500">*</span>
                </label>
                {getProviderDocUrl(provider) && (
                  <a
                    href={getProviderDocUrl(provider)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    获取 Key
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
              <div className="relative group">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`请输入您的 ${getProviderDisplayName(provider)} API Key`}
                  className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showApiKey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Model Name Input (Always Visible) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                模型名称 <span className="text-gray-400 font-normal normal-case">(默认为 {getProviderDefaultModel(provider) || "gpt-4o-mini"})</span>
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={getProviderDefaultModel(provider)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Custom Provider Base URL */}
            {provider === "custom" && (
              <div className="pt-2 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Base URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                  testResult === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult === "success" ? (
                    <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        连接成功！
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        连接失败
                    </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTest}
                disabled={!apiKey || isTesting}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTesting ? "测试中..." : "测试连接"}
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKey}
                className="flex-[2] py-2.5 px-4 bg-gray-900 text-white border border-transparent rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gray-900/10 transition-all active:transform active:scale-[0.98]"
              >
                保存配置
              </button>
            </div>
        </div>

        {/* Storage Management Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💾</span>
                <h2 className="font-semibold text-gray-900">存储使用情况</h2>
            </div>

          {storageUsage && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                  <span>已用空间</span>
                  <span>
                    {formatSize(storageUsage.used)} / {formatSize(storageUsage.limit)}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      storageUsage.percentage >= 0.9
                        ? "bg-red-500"
                        : storageUsage.percentage >= 0.7
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(storageUsage.percentage * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  导出数据
                </button>
                <button
                  onClick={handleClearData}
                  className="flex items-center justify-center gap-2 py-2 px-3 border border-red-100 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 hover:border-red-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  清空数据
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">ℹ️</span>
                <h2 className="font-semibold text-gray-900">关于 Demand Radar</h2>
            </div>
            <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
                <p>
                    <strong>Demand Radar</strong> 帮助您从用户讨论中发现产品机会。
                </p>
                <ul className="list-disc pl-4 space-y-1 text-gray-500">
                    <li>分析 Reddit 帖子和知乎问答</li>
                    <li>提取痛点和市场空白</li>
                    <li>保存洞察以备后用</li>
                </ul>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-400">版本 1.0.0</span>
                    <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        发送反馈
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
