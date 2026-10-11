/**
 * Storelistener — Isolated Mock Data for Module 1 (Owner Dashboard UI Foundation)
 * File: src/data/mockDashboardData.js
 * 
 * NOTE: This file contains demonstration data strictly for UI layout and development verification.
 * It does NOT represent live production or recorded store audio data.
 */

export const MOCK_DATA_DISCLAIMER = {
  isMock: true,
  label: 'Development Mock Data',
  description: 'Displaying isolated sample metrics for UI layout verification. Backend API integration occurs in subsequent modules.',
};

export const MOCK_KPIS = [
  {
    id: 'active-conversations',
    label: 'Active Conversations',
    value: '5',
    supportingText: 'Across all 3 store counters',
    iconName: 'Hearing', // MUI Icon
    category: 'live',
  },
  {
    id: 'total-conversations-today',
    label: 'Total Conversations Today',
    value: '42',
    supportingText: 'Recorded sessions today',
    iconName: 'Forum',
    category: 'total',
  },
  {
    id: 'deals-closed-today',
    label: 'Deals Closed Today',
    value: '18',
    supportingText: 'Verified purchases',
    iconName: 'CheckCircle',
    category: 'success',
  },
  {
    id: 'deals-pending-review',
    label: 'Deals Pending Review',
    value: '7',
    supportingText: 'Awaiting manager audit',
    iconName: 'HourglassEmpty',
    category: 'warning',
  },
];

export const MOCK_STORES = [
  {
    id: 'store-01',
    code: 'STORE-01',
    name: 'iPhone Store 01',
    status: 'Online', // 'Online' | 'Offline' | 'Not Connected'
    activeConversations: 2,
    workstationsCount: 3,
    lastSync: '1 min ago',
  },
  {
    id: 'store-02',
    code: 'STORE-02',
    name: 'iPhone Store 02',
    status: 'Online',
    activeConversations: 3,
    workstationsCount: 4,
    lastSync: 'Just now',
  },
  {
    id: 'store-03',
    code: 'STORE-03',
    name: 'iPhone Store 03',
    status: 'Not Connected',
    activeConversations: 0,
    workstationsCount: 2,
    lastSync: '14 mins ago',
  },
];

export const MOCK_RECENT_CONVERSATIONS = [
  {
    id: 'conv-101',
    title: 'iPhone 16 Pro Max Trade-in Inquiry',
    storeName: 'iPhone Store 01',
    storeId: 'store-01',
    startedAt: '10:42 AM',
    duration: '4m 15s',
    dealStatus: 'Closed', // 'Closed' | 'Pending' | 'Not Closed' | 'Under Review'
  },
  {
    id: 'conv-102',
    title: 'Storage & Color Options Discussion',
    storeName: 'iPhone Store 02',
    storeId: 'store-02',
    startedAt: '10:35 AM',
    duration: '6m 20s',
    dealStatus: 'Pending',
  },
  {
    id: 'conv-103',
    title: 'Carrier Financing & Monthly Plan Pitch',
    storeName: 'iPhone Store 02',
    storeId: 'store-02',
    startedAt: '10:18 AM',
    duration: '8m 45s',
    dealStatus: 'Closed',
  },
  {
    id: 'conv-104',
    title: 'AppleCare+ Bundle Objection Handling',
    storeName: 'iPhone Store 01',
    storeId: 'store-01',
    startedAt: '09:55 AM',
    duration: '3m 50s',
    dealStatus: 'Under Review',
  },
  {
    id: 'conv-105',
    title: 'Walk-in Pricing Comparison',
    storeName: 'iPhone Store 01',
    storeId: 'store-01',
    startedAt: '09:30 AM',
    duration: '2m 10s',
    dealStatus: 'Not Closed',
  },
];
