import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  alertCount: 0,
  setAlertCount: (count) => set({ alertCount: count }),
}));

export const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now();
    const newToast = { id, ...toast };
    set({ toasts: [...get().toasts.slice(-2), newToast] }); // Max 3
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) });
    }, 4000);
  },
  removeToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));

export const useSidebarStore = create((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),
}));
