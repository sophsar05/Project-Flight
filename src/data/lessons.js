export const moduleIcons = {
  law: '<svg viewBox="0 0 24 24"><path d="M12 3v15"></path><path d="M7 6h10"></path><path d="m6 9-3 5h6L6 9Z"></path><path d="m18 9-3 5h6l-3-5Z"></path><path d="M8 21h8"></path></svg>',
  aircraft: '<svg viewBox="0 0 24 24"><path d="M4 16h16"></path><path d="M7 16l3-8h4l3 8"></path><path d="M9 12h6"></path><path d="M6 19h12"></path></svg>',
  flight: '<svg viewBox="0 0 24 24"><path d="M3 14c5-5 11-7 18-6"></path><path d="M4 16c5-2 10-2 16 0"></path><path d="M6 20h12"></path></svg>',
  weather: '<svg viewBox="0 0 24 24"><path d="M17 8a4 4 0 1 0-7.7 1.5"></path><path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.8 1.2A3.5 3.5 0 0 0 7 18Z"></path><path d="M4 21h12"></path></svg>',
  navigation: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
  planning: '<svg viewBox="0 0 24 24"><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="m7 16 4-5 3 3 5-7"></path><path d="M12 19l6-3"></path></svg>',
  human: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"></circle><path d="M6 21a6 6 0 0 1 12 0"></path><path d="M4 14h4l2-3 3 6 2-3h5"></path></svg>',
  comms: '<svg viewBox="0 0 24 24"><path d="M12 20V8"></path><path d="m7 20 5-12 5 12"></path><path d="M8 9a6 6 0 0 1 8 0"></path><path d="M5 6a10 10 0 0 1 14 0"></path></svg>',
};

export const lessons = [
  ['Air Law / Operational Procedures', 'Scale + checklist', moduleIcons.law],
  ['Aircraft General Knowledge', 'Aircraft systems and structure', moduleIcons.aircraft],
  ['Principles of Flight', 'Wing with airflow lines', moduleIcons.flight],
  ['Meteorology', 'Cloud, sun, and wind', moduleIcons.weather],
  ['Navigation', 'Compass and route planning', moduleIcons.navigation],
  ['Flight Performance & Planning', 'Graph, speed, and aircraft planning', moduleIcons.planning],
  ['Human Performance', 'Pilot physiology and limits', moduleIcons.human],
  ['Communications', 'Radio and signal procedures', moduleIcons.comms],
];

export const moduleStyles = {
  'Air Law / Operational Procedures': { iconBg: 'linear-gradient(145deg,rgba(255,156,107,.88),rgba(255,211,184,.48))', activeBg: 'linear-gradient(145deg,rgba(255,156,107,.94),rgba(235,111,75,.88))', iconColor: '#fffaf4', accent: 'rgba(242,142,84,.92)', accentDark: 'rgba(225,104,67,.84)', soft: 'rgba(255,242,234,.56)', border: 'rgba(242,142,84,.36)', shadow: 'rgba(225,104,67,.16)' },
  'Aircraft General Knowledge': { iconBg: 'linear-gradient(145deg,rgba(143,207,255,.82),rgba(225,244,255,.50))', activeBg: 'linear-gradient(145deg,rgba(92,173,226,.88),rgba(49,119,166,.82))', iconColor: '#24688f', accent: 'rgba(92,173,226,.88)', accentDark: 'rgba(49,119,166,.82)', soft: 'rgba(225,244,255,.50)', border: 'rgba(92,173,226,.38)', shadow: 'rgba(76,150,205,.15)' },
  'Principles of Flight': { iconBg: 'linear-gradient(145deg,rgba(126,194,142,.78),rgba(220,244,226,.52))', activeBg: 'linear-gradient(145deg,rgba(94,177,113,.88),rgba(46,126,70,.82))', iconColor: '#2f7b42', accent: 'rgba(94,177,113,.88)', accentDark: 'rgba(46,126,70,.82)', soft: 'rgba(220,244,226,.52)', border: 'rgba(94,177,113,.38)', shadow: 'rgba(79,159,98,.15)' },
  'Meteorology': { iconBg: 'linear-gradient(145deg,rgba(255,207,118,.84),rgba(255,242,200,.52))', activeBg: 'linear-gradient(145deg,rgba(245,184,72,.90),rgba(181,119,28,.82))', iconColor: '#9a6315', accent: 'rgba(245,184,72,.90)', accentDark: 'rgba(181,119,28,.82)', soft: 'rgba(255,242,200,.52)', border: 'rgba(245,184,72,.38)', shadow: 'rgba(209,146,35,.15)' },
  'Navigation': { iconBg: 'linear-gradient(145deg,rgba(126,170,255,.74),rgba(224,233,255,.54))', activeBg: 'linear-gradient(145deg,rgba(94,135,226,.88),rgba(55,91,171,.82))', iconColor: '#355da6', accent: 'rgba(94,135,226,.88)', accentDark: 'rgba(55,91,171,.82)', soft: 'rgba(224,233,255,.54)', border: 'rgba(94,135,226,.38)', shadow: 'rgba(77,107,190,.14)' },
  'Flight Performance & Planning': { iconBg: 'linear-gradient(145deg,rgba(185,150,255,.70),rgba(238,229,255,.54))', activeBg: 'linear-gradient(145deg,rgba(151,108,232,.86),rgba(101,65,170,.82))', iconColor: '#6842a8', accent: 'rgba(151,108,232,.86)', accentDark: 'rgba(101,65,170,.82)', soft: 'rgba(238,229,255,.54)', border: 'rgba(151,108,232,.36)', shadow: 'rgba(118,78,185,.14)' },
  'Human Performance': { iconBg: 'linear-gradient(145deg,rgba(255,145,166,.72),rgba(255,225,232,.54))', activeBg: 'linear-gradient(145deg,rgba(232,103,130,.86),rgba(173,61,89,.82))', iconColor: '#a83f5a', accent: 'rgba(232,103,130,.86)', accentDark: 'rgba(173,61,89,.82)', soft: 'rgba(255,225,232,.54)', border: 'rgba(232,103,130,.36)', shadow: 'rgba(190,72,98,.14)' },
  'Communications': { iconBg: 'linear-gradient(145deg,rgba(86,201,190,.72),rgba(218,247,244,.54))', activeBg: 'linear-gradient(145deg,rgba(51,178,167,.86),rgba(31,120,111,.82))', iconColor: '#1f786f', accent: 'rgba(51,178,167,.86)', accentDark: 'rgba(31,120,111,.82)', soft: 'rgba(218,247,244,.54)', border: 'rgba(51,178,167,.36)', shadow: 'rgba(43,157,148,.14)' },
};
