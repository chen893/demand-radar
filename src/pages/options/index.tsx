/**
 * Options 页面入口
 * 用于首次安装引导和完整设置
 */

import React, { useEffect, useState } from "react";
import "./style.css";
import { MessageType } from "@/shared/types/messages";
import type { LLMConfig } from "@/shared/types/config";
import { PROVIDER_PRESETS } from "@/shared/constants";

type LLMProvider = LLMConfig["provider"];

const PROVIDERS: { value: LLMProvider; label: string; description: string }[] = [
  {
    value: "deepseek",
    label: "DeepSeek",
    description: "国产大模型，性价比极高，推荐使用",
  },
  {
    value: "openai",
    label: "OpenAI",
    description: "GPT-4o-mini，质量稳定",
  },
  {
    value: "google",
    label: "Google Gemini",
    description: "Gemini 2.0 Flash，速度快",
  },
  {
    value: "custom",
    label: "自定义",
    description: "任何 OpenAI 兼容的 API",
  },
];

export default function OptionsPage() {
  // 检查是否为欢迎页面
  const isWelcome = new URLSearchParams(window.location.search).get("welcome") === "true";

  // 状态
  const [step, setStep] = useState(isWelcome ? 1 : 0);
  const [provider, setProvider] = useState<LLMProvider>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 加载已有配置
  useEffect(() => {
    if (!isWelcome) {
      loadConfig();
    }
  }, []);

  const loadConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_CONFIG,
      });
      if (response.success && response.data?.llmConfig) {
        const config = response.data.llmConfig;
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setBaseUrl(config.baseUrl || "");
        setModelName(config.modelName || "");
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  // 测试连接
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.TEST_LLM_CONNECTION,
        payload: {
          provider,
          apiKey,
          baseUrl: provider === "custom" ? baseUrl : undefined,
          modelName: provider === "custom" ? modelName : undefined,
        },
      });
      setTestResult(response.success ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    setIsSaving(true);

    try {
      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_CONFIG,
        payload: {
          provider,
          apiKey,
          baseUrl: provider === "custom" ? baseUrl : undefined,
          modelName: provider === "custom" ? modelName : undefined,
        },
      });

      if (isWelcome) {
        setStep(3); // 完成步骤
      } else {
        alert("配置已保存！");
      }
    } catch (error) {
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  // 跳过设置
  const handleSkip = () => {
    if (isWelcome) {
      window.close();
    }
  };

  // 完成设置
  const handleComplete = () => {
    window.close();
  };

  // 欢迎页面 - 步骤 1: 介绍
  if (isWelcome && step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📡</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              欢迎使用 Demand Radar
            </h1>
            <p className="text-gray-600">
              从用户讨论中发现产品机会
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <FeatureItem
              icon="🔍"
              title="智能提取"
              description="自动识别 Reddit、知乎等平台的用户讨论"
            />
            <FeatureItem
              icon="🤖"
              title="AI 分析"
              description="通过 AI 提炼可执行的产品方向"
            />
            <FeatureItem
              icon="📊"
              title="本地存储"
              description="所有数据存储在本地，保护你的隐私"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              稍后设置
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              开始配置
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 欢迎页面 - 步骤 2: 配置 LLM
  // 或者非欢迎页面的设置
  if ((isWelcome && step === 2) || !isWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            {isWelcome && (
              <div className="text-sm text-gray-500 mb-2">步骤 2 / 2</div>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {isWelcome ? "配置 AI 服务" : "LLM 设置"}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              选择你的 AI 服务提供商并输入 API Key
            </p>
          </div>

          <div className="space-y-5">
            {/* 服务商选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                服务商
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setProvider(p.value)}
                    className={`p-3 border rounded-xl text-left transition-all ${
                      provider === p.value
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  API Key
                </label>
                {PROVIDER_PRESETS[provider]?.docUrl && (
                  <a
                    href={PROVIDER_PRESETS[provider].docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    获取 Key →
                  </a>
                )}
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 自定义服务商配置 */}
            {provider === "custom" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* 测试结果 */}
            {testResult && (
              <div
                className={`p-4 rounded-xl ${
                  testResult === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult === "success"
                  ? "✅ 连接成功！"
                  : "❌ 连接失败，请检查 API Key 是否正确"}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTest}
                disabled={!apiKey || isTesting}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTesting ? "测试中..." : "测试连接"}
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKey || isSaving}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSaving ? "保存中..." : "保存配置"}
              </button>
            </div>

            {isWelcome && (
              <button
                onClick={handleSkip}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                跳过，稍后设置
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 欢迎页面 - 步骤 3: 完成
  if (isWelcome && step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            设置完成！
          </h1>
          <p className="text-gray-600 mb-8">
            现在你可以开始使用 Demand Radar 了
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
            <h3 className="font-medium text-gray-900 mb-2">快速开始</h3>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. 打开 Reddit 或知乎的讨论页面</li>
              <li>2. 点击浏览器工具栏的 📡 图标</li>
              <li>3. 点击「分析此页面」</li>
              <li>4. 查看并保存识别到的产品方向</li>
            </ol>
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
          >
            开始使用
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 功能项组件
 */
function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </div>
  );
}
