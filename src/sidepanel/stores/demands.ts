/**
 * 需求库状态管理
 * 管理已保存的产品方向列表
 */

import { create } from "zustand";
import type { Demand } from "@/shared/types/demand";
import { MessageType } from "@/shared/types/messages";

interface DemandsState {
  // 列表状态
  demands: Demand[];
  isLoading: boolean;
  error: string | null;

  // 筛选状态
  searchQuery: string;
  filterStarred: boolean;
  filterArchived: boolean;
  filterTags: string[];

  // 详情状态
  selectedDemandId: string | null;
  selectedDemand: Demand | null;

  // 所有标签
  allTags: string[];

  // 操作
  fetchDemands: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterStarred: (starred: boolean) => void;
  setFilterArchived: (archived: boolean) => void;
  setFilterTags: (tags: string[]) => void;
  selectDemand: (id: string | null) => void;
  toggleStar: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  deleteDemand: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDemandsStore = create<DemandsState>((set, get) => ({
  // 初始状态
  demands: [],
  isLoading: false,
  error: null,
  searchQuery: "",
  filterStarred: false,
  filterArchived: false,
  filterTags: [],
  selectedDemandId: null,
  selectedDemand: null,
  allTags: [],

  // 获取需求列表
  fetchDemands: async () => {
    set({ isLoading: true, error: null });

    try {
      const { searchQuery, filterStarred, filterArchived } = get();

      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_DEMANDS,
        payload: {
          query: searchQuery || undefined,
          starred: filterStarred || undefined,
          archived: filterArchived || undefined,
        },
      });

      if (response.success) {
        const demands = response.data as Demand[];
        // 提取所有标签
        const tagsSet = new Set<string>();
        demands.forEach((d) => d.tags.forEach((tag) => tagsSet.add(tag)));

        set({
          demands,
          allTags: Array.from(tagsSet).sort(),
          isLoading: false,
        });
      } else {
        set({ error: response.error || "获取需求列表失败", isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "获取需求列表失败",
        isLoading: false,
      });
    }
  },

  // 设置搜索关键词
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    // 搜索时自动刷新
    get().fetchDemands();
  },

  // 设置收藏筛选
  setFilterStarred: (starred) => {
    set({ filterStarred: starred });
    get().fetchDemands();
  },

  // 设置归档筛选
  setFilterArchived: (archived) => {
    set({ filterArchived: archived });
    get().fetchDemands();
  },

  // 设置标签筛选
  setFilterTags: (tags) => {
    set({ filterTags: tags });
    // 标签筛选在前端执行
  },

  // 选中需求查看详情
  selectDemand: async (id) => {
    if (!id) {
      set({ selectedDemandId: null, selectedDemand: null });
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_DEMAND_BY_ID,
        payload: id,
      });

      if (response.success) {
        set({ selectedDemandId: id, selectedDemand: response.data });
      }
    } catch (error) {
      console.error("Failed to fetch demand detail:", error);
    }
  },

  // 切换收藏状态
  toggleStar: async (id) => {
    try {
      const demand = get().demands.find((d) => d.id === id);
      if (!demand) return;

      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_DEMAND,
        payload: { id, updates: { starred: !demand.starred } },
      });

      // 更新本地状态
      set((state) => ({
        demands: state.demands.map((d) =>
          d.id === id ? { ...d, starred: !d.starred } : d
        ),
        selectedDemand:
          state.selectedDemand?.id === id
            ? { ...state.selectedDemand, starred: !state.selectedDemand.starred }
            : state.selectedDemand,
      }));
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  },

  // 切换归档状态
  toggleArchive: async (id) => {
    try {
      const demand = get().demands.find((d) => d.id === id);
      if (!demand) return;

      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_DEMAND,
        payload: { id, updates: { archived: !demand.archived } },
      });

      // 更新本地状态
      set((state) => ({
        demands: state.demands.map((d) =>
          d.id === id ? { ...d, archived: !d.archived } : d
        ),
        selectedDemand:
          state.selectedDemand?.id === id
            ? { ...state.selectedDemand, archived: !state.selectedDemand.archived }
            : state.selectedDemand,
      }));
    } catch (error) {
      console.error("Failed to toggle archive:", error);
    }
  },

  // 更新笔记
  updateNotes: async (id, notes) => {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_DEMAND,
        payload: { id, updates: { notes } },
      });

      // 更新本地状态
      set((state) => ({
        demands: state.demands.map((d) =>
          d.id === id ? { ...d, notes } : d
        ),
        selectedDemand:
          state.selectedDemand?.id === id
            ? { ...state.selectedDemand, notes }
            : state.selectedDemand,
      }));
    } catch (error) {
      console.error("Failed to update notes:", error);
    }
  },

  // 添加标签
  addTag: async (id, tag) => {
    try {
      const demand = get().demands.find((d) => d.id === id);
      if (!demand || demand.tags.includes(tag)) return;

      const newTags = [...demand.tags, tag];

      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_DEMAND,
        payload: { id, updates: { tags: newTags } },
      });

      // 更新本地状态
      set((state) => {
        const tagsSet = new Set(state.allTags);
        tagsSet.add(tag);

        return {
          demands: state.demands.map((d) =>
            d.id === id ? { ...d, tags: newTags } : d
          ),
          selectedDemand:
            state.selectedDemand?.id === id
              ? { ...state.selectedDemand, tags: newTags }
              : state.selectedDemand,
          allTags: Array.from(tagsSet).sort(),
        };
      });
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  },

  // 移除标签
  removeTag: async (id, tag) => {
    try {
      const demand = get().demands.find((d) => d.id === id);
      if (!demand) return;

      const newTags = demand.tags.filter((t) => t !== tag);

      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_DEMAND,
        payload: { id, updates: { tags: newTags } },
      });

      // 更新本地状态
      set((state) => ({
        demands: state.demands.map((d) =>
          d.id === id ? { ...d, tags: newTags } : d
        ),
        selectedDemand:
          state.selectedDemand?.id === id
            ? { ...state.selectedDemand, tags: newTags }
            : state.selectedDemand,
      }));
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  },

  // 删除需求
  deleteDemand: async (id) => {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.DELETE_DEMAND,
        payload: id,
      });

      // 更新本地状态
      set((state) => ({
        demands: state.demands.filter((d) => d.id !== id),
        selectedDemandId:
          state.selectedDemandId === id ? null : state.selectedDemandId,
        selectedDemand:
          state.selectedDemand?.id === id ? null : state.selectedDemand,
      }));
    } catch (error) {
      console.error("Failed to delete demand:", error);
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

/**
 * 获取过滤后的需求列表
 * 用于处理标签筛选（前端执行）
 */
export function useFilteredDemands(): Demand[] {
  const { demands, filterTags } = useDemandsStore();

  if (filterTags.length === 0) {
    return demands;
  }

  return demands.filter((d) =>
    filterTags.some((tag) => d.tags.includes(tag))
  );
}
