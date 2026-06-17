// 通用小组件接口（非 iOS/Android 平台使用）
export async function updateMoodWidget() {}
export function setupWidgetInteractionListener() {
  return { remove: () => {} };
}
export default { updateMoodWidget, setupWidgetInteractionListener };
