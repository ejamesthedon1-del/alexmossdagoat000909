// Shared state for API routes (in-memory, resets on cold start)
// In production, use a database or Redis/Vercel KV

let activities = [];
let approvals = {};

export function getActivities() {
  return activities;
}

export function addActivity(activity) {
  activities.unshift(activity);
  activities = activities.slice(0, 100);
  return activity;
}

export function getApproval(activityId) {
  return approvals[activityId];
}

export function setApproval(activityId, approval) {
  approvals[activityId] = approval;
}

export function clearState() {
  activities = [];
  approvals = {};
}

