/**
 * Storelistener — Isolated Demonstration Data for Module 2 (Live Monitoring Interface)
 * File: src/data/mockLiveMonitoringData.js
 * 
 * NOTE: This file contains demonstration records strictly for UI layout and interface testing.
 * It does NOT represent live audio feeds, actual customer recordings, or real-time speech.
 */

export const LIVE_MONITORING_DISCLAIMER = {
  isDemonstration: true,
  badgeText: 'Simulated Feed',
  bannerText: 'Demonstration Mode: Displaying simulated counter conversations and pre-recorded sample transcript records. Hardware microphone feeds and real-time capture connect in subsequent modules.',
};

export const MONITORING_STORES = [
  {
    id: 'store-01',
    code: 'STORE-01',
    name: 'iPhone Store 01',
    status: 'Online', // 'Online' | 'Offline' | 'Not Connected'
    activeCount: 2,
    location: 'North Counter Floor',
  },
  {
    id: 'store-02',
    code: 'STORE-02',
    name: 'iPhone Store 02',
    status: 'Online',
    activeCount: 2,
    location: 'Central Counter Floor',
  },
  {
    id: 'store-03',
    code: 'STORE-03',
    name: 'iPhone Store 03',
    status: 'Not Connected',
    activeCount: 0,
    location: 'South Counter Floor',
  },
];

export const MOCK_LIVE_CONVERSATIONS = {
  'store-01': [
    {
      id: 'conv-live-101',
      title: 'iPhone 16 Pro Max Trade-In & AppleCare+',
      storeId: 'store-01',
      storeName: 'iPhone Store 01',
      workstation: 'Counter POS-01',
      salesRep: 'Specialist A',
      startedAt: '14:32:10',
      elapsedSimulated: '5m 12s',
      recordingState: 'Active',
      dealStatus: 'Pending', // 'Pending' | 'Closed' | 'Not Closed' | 'Under Review'
      notes: 'Customer evaluating Desert Titanium 256GB. Reviewing promotional trade-in valuation and AppleCare+ warranty options.',
      transcript: [
        {
          id: 't1',
          speaker: 'Salesperson',
          time: '14:32:15',
          text: 'Welcome in! Are you looking for a specific iPhone 16 model today?',
        },
        {
          id: 't2',
          speaker: 'Customer',
          time: '14:32:28',
          text: 'Hi, yes, I wanted to compare the 16 Pro Max with the standard 16 Pro regarding battery performance and trade-in value.',
        },
        {
          id: 't3',
          speaker: 'Salesperson',
          time: '14:32:45',
          text: 'Certainly. The Pro Max features up to 33 hours of video playback. What device are you currently trading in?',
        },
        {
          id: 't4',
          speaker: 'Customer',
          time: '14:33:02',
          text: 'An iPhone 13 Pro in good condition. Would that qualify for the full promotional trade credit?',
        },
        {
          id: 't5',
          speaker: 'Salesperson',
          time: '14:33:20',
          text: 'Yes, pending optical and diagnostic verification here at the terminal, that qualifies for up to $420 toward your new device.',
        },
        {
          id: 't6',
          speaker: 'Customer',
          time: '14:33:45',
          text: 'That sounds reasonable. Can we run the numbers with the 256GB storage tier?',
        },
        {
          id: 't7',
          speaker: 'Salesperson',
          time: '14:34:10',
          text: 'Right away. I will also print out the AppleCare+ theft and loss protection breakdown for you.',
        },
      ],
    },
    {
      id: 'conv-live-102',
      title: 'Storage Capacity & Natural Titanium Stock',
      storeId: 'store-01',
      storeName: 'iPhone Store 01',
      workstation: 'Counter POS-02',
      salesRep: 'Specialist B',
      startedAt: '14:35:40',
      elapsedSimulated: '2m 45s',
      recordingState: 'Active',
      dealStatus: 'Under Review',
      notes: 'Customer checking Natural Titanium in-stock availability and accessories.',
      transcript: [
        {
          id: 't201',
          speaker: 'Customer',
          time: '14:35:45',
          text: 'Do you have the iPhone 16 Pro in Natural Titanium 128GB in stock today?',
        },
        {
          id: 't202',
          speaker: 'Salesperson',
          time: '14:36:02',
          text: 'Let me check our secure inventory vault. Yes, we have two units remaining available for immediate activation.',
        },
        {
          id: 't203',
          speaker: 'Customer',
          time: '14:36:20',
          text: 'Great, can we also look at MagSafe clear cases and the 25W USB-C charger?',
        },
      ],
    },
  ],
  'store-02': [
    {
      id: 'conv-live-201',
      title: 'Carrier 0% Financing & Plan Verification',
      storeId: 'store-02',
      storeName: 'iPhone Store 02',
      workstation: 'Counter POS-01',
      salesRep: 'Specialist C',
      startedAt: '14:28:00',
      elapsedSimulated: '8m 30s',
      recordingState: 'Active',
      dealStatus: 'Closed',
      notes: 'Customer approved 36-month zero-interest carrier agreement. Deal finalized.',
      transcript: [
        {
          id: 't301',
          speaker: 'Customer',
          time: '14:28:10',
          text: 'I received an email offer for zero-down carrier financing. Can that be processed here at the counter?',
        },
        {
          id: 't302',
          speaker: 'Salesperson',
          time: '14:28:30',
          text: 'Yes, as an authorized retailer, we verify and execute the carrier terms directly on this terminal.',
        },
        {
          id: 't303',
          speaker: 'Customer',
          time: '14:29:15',
          text: 'Perfect. Let us go ahead and finalize the paperwork for the Black Titanium 512GB model.',
        },
      ],
    },
    {
      id: 'conv-live-202',
      title: 'Accessory Bundle & Screen Protector Pitch',
      storeId: 'store-02',
      storeName: 'iPhone Store 02',
      workstation: 'Counter POS-03',
      salesRep: 'Specialist D',
      startedAt: '14:36:15',
      elapsedSimulated: '1m 50s',
      recordingState: 'Active',
      dealStatus: 'Pending',
      notes: 'Customer asking about tempered glass lifetime replacement policy.',
      transcript: [
        {
          id: 't401',
          speaker: 'Salesperson',
          time: '14:36:20',
          text: 'Would you like our counter technician to apply the Belkin UltraGlass screen protector with the machine applicator?',
        },
        {
          id: 't402',
          speaker: 'Customer',
          time: '14:36:40',
          text: 'Does that include replacement coverage if the protector ever chips or cracks?',
        },
      ],
    },
  ],
  'store-03': [], // Intentionally empty to verify clean empty states
};
