export function calculateWorkload(tasks, availableHours) {
  const pendingTasks = tasks.filter((task) => !task.completed);
  const plannedHours = pendingTasks.reduce((total, task) => total + Number(task.estimated_hours || 0), 0);
  const available = Number(availableHours || 0);
  if (available <= 0) return { plannedHours, availableHours: available, percentage: 100, risk: "CRITICAL", message: "Set your available hours to calculate your workload." };
  const ratio = plannedHours / available;
  const percentage = Math.round(ratio * 100);
  if (ratio >= 1.4) return { plannedHours, availableHours: available, percentage: Math.min(100, percentage), risk: "CRITICAL", message: "Your schedule is overloaded. Rescue Mode can help you reorganize." };
  if (ratio >= 1) return { plannedHours, availableHours: available, percentage: Math.min(100, percentage), risk: "HIGH", message: "You have more work than your available time." };
  if (ratio >= 0.7) return { plannedHours, availableHours: available, percentage, risk: "MODERATE", message: "Your workload is manageable, but keep some buffer." };
  return { plannedHours, availableHours: available, percentage, risk: "SAFE", message: "Your schedule has a healthy time buffer." };
}
