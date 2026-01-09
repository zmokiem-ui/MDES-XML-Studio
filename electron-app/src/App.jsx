import React, { useState, useEffect } from 'react'
import { 
  Globe, FileText, Database, Map, Save, Rocket, 
  ChevronDown, ChevronUp, Building2, Users, User, 
  CheckCircle2, AlertCircle, Loader2, FolderOpen,
  Info, Sparkles, Upload, Download, Table, Eye, X,
  BarChart3, History, Trash2, Calendar, Settings,
  Moon, Sun, Home, XCircle, RefreshCw, FileEdit,
  AlertTriangle, Minus, Plus, Search, Flag, ArrowLeft,
  DollarSign, Landmark, FileCheck
} from 'lucide-react'
import { COUNTRIES, DEFAULT_PARTNER_JURISDICTIONS, getCountryName, searchCountries } from './countryData'

function App() {
  // Module selection (CRS, FATCA, future: CBC, NTJ)
  const [activeModule, setActiveModule] = useState(null) // null = module selection screen
  
  // Navigation within module
  const [currentPage, setCurrentPage] = useState('generator')
  
  // Theme system with distinct, vibrant color schemes
  const THEMES = {
    light: {
      name: 'Light',
      emoji: '☀️',
      isDark: false,
      // Backgrounds
      bg: 'bg-gray-50',
      card: 'bg-white border-gray-200',
      cardHover: 'hover:bg-gray-50 hover:border-gray-300',
      header: 'bg-white border-gray-200',
      // Text
      text: 'text-gray-900',
      textMuted: 'text-gray-500',
      // Inputs
      input: 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500',
      inputFocus: 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      // Primary buttons
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
      // Accents
      accent: 'bg-blue-600',
      accentHover: 'hover:bg-blue-700',
      accentText: 'text-blue-600',
      accentLight: 'bg-blue-50 border-blue-200 text-blue-700',
      // Icons
      icon: 'text-gray-500',
      iconHover: 'hover:text-blue-600',
      iconActive: 'text-blue-600',
      // Badges & Tags
      badge: 'bg-blue-100 text-blue-700',
      badgeSuccess: 'bg-green-100 text-green-700',
      badgeWarning: 'bg-amber-100 text-amber-700',
      badgeError: 'bg-red-100 text-red-700',
      // Borders
      border: 'border-gray-200',
      borderHover: 'hover:border-gray-300',
      borderFocus: 'focus:border-blue-500',
      // Toggle
      toggleOn: 'bg-blue-600',
      toggleOff: 'bg-gray-300',
      // Preview gradient
      preview: 'from-blue-500 to-indigo-600'
    },
    dark: {
      name: 'Dark',
      emoji: '🌙',
      isDark: true,
      bg: 'bg-gray-950',
      card: 'bg-gray-900 border-gray-800',
      cardHover: 'hover:bg-gray-800 hover:border-gray-700',
      header: 'bg-gray-900 border-gray-800',
      text: 'text-gray-100',
      textMuted: 'text-gray-400',
      input: 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-500 focus:ring-blue-500',
      inputFocus: 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
      buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700',
      buttonDanger: 'bg-red-600 hover:bg-red-500 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-500 text-white',
      accent: 'bg-blue-600',
      accentHover: 'hover:bg-blue-500',
      accentText: 'text-blue-400',
      accentLight: 'bg-blue-950 border-blue-800 text-blue-300',
      icon: 'text-gray-400',
      iconHover: 'hover:text-blue-400',
      iconActive: 'text-blue-400',
      badge: 'bg-blue-900/60 text-blue-300',
      badgeSuccess: 'bg-green-900/60 text-green-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-red-900/60 text-red-300',
      border: 'border-gray-800',
      borderHover: 'hover:border-gray-700',
      borderFocus: 'focus:border-blue-500',
      toggleOn: 'bg-blue-600',
      toggleOff: 'bg-gray-700',
      preview: 'from-blue-600 to-indigo-800'
    },
    midnight: {
      name: 'Midnight',
      emoji: '🌌',
      isDark: true,
      bg: 'bg-[#0f0f23]',
      card: 'bg-[#1a1a2e] border-[#2d2d44]',
      cardHover: 'hover:bg-[#252542] hover:border-[#3d3d5c]',
      header: 'bg-[#1a1a2e] border-[#2d2d44]',
      text: 'text-[#e0e0ff]',
      textMuted: 'text-[#8888aa]',
      input: 'bg-[#252542] border-[#3d3d5c] text-[#e0e0ff] focus:border-violet-500 focus:ring-violet-500',
      inputFocus: 'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
      buttonPrimary: 'bg-violet-600 hover:bg-violet-500 text-white',
      buttonSecondary: 'bg-[#252542] hover:bg-[#2d2d55] text-[#c0c0dd] border border-[#3d3d5c]',
      buttonDanger: 'bg-rose-600 hover:bg-rose-500 text-white',
      buttonSuccess: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      accent: 'bg-violet-600',
      accentHover: 'hover:bg-violet-500',
      accentText: 'text-violet-400',
      accentLight: 'bg-violet-950/50 border-violet-800 text-violet-300',
      icon: 'text-[#8888aa]',
      iconHover: 'hover:text-violet-400',
      iconActive: 'text-violet-400',
      badge: 'bg-violet-900/60 text-violet-300',
      badgeSuccess: 'bg-emerald-900/60 text-emerald-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-rose-900/60 text-rose-300',
      border: 'border-[#2d2d44]',
      borderHover: 'hover:border-[#3d3d5c]',
      borderFocus: 'focus:border-violet-500',
      toggleOn: 'bg-violet-600',
      toggleOff: 'bg-[#3d3d5c]',
      preview: 'from-violet-600 to-purple-900'
    },
    ocean: {
      name: 'Ocean',
      emoji: '🌊',
      isDark: true,
      bg: 'bg-[#0a192f]',
      card: 'bg-[#112240] border-[#1d3a5f]',
      cardHover: 'hover:bg-[#1a3050] hover:border-[#2a4a70]',
      header: 'bg-[#112240] border-[#1d3a5f]',
      text: 'text-[#ccd6f6]',
      textMuted: 'text-[#8892b0]',
      input: 'bg-[#1a3050] border-[#2a4a70] text-[#ccd6f6] focus:border-cyan-400 focus:ring-cyan-400',
      inputFocus: 'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
      buttonPrimary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      buttonSecondary: 'bg-[#1a3050] hover:bg-[#234060] text-[#a8b2d1] border border-[#2a4a70]',
      buttonDanger: 'bg-red-500 hover:bg-red-400 text-white',
      buttonSuccess: 'bg-teal-500 hover:bg-teal-400 text-white',
      accent: 'bg-cyan-500',
      accentHover: 'hover:bg-cyan-400',
      accentText: 'text-cyan-400',
      accentLight: 'bg-cyan-950/50 border-cyan-800 text-cyan-300',
      icon: 'text-[#8892b0]',
      iconHover: 'hover:text-cyan-400',
      iconActive: 'text-cyan-400',
      badge: 'bg-cyan-900/60 text-cyan-300',
      badgeSuccess: 'bg-teal-900/60 text-teal-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-red-900/60 text-red-300',
      border: 'border-[#1d3a5f]',
      borderHover: 'hover:border-[#2a4a70]',
      borderFocus: 'focus:border-cyan-400',
      toggleOn: 'bg-cyan-500',
      toggleOff: 'bg-[#2a4a70]',
      preview: 'from-cyan-500 to-blue-700'
    },
    sunset: {
      name: 'Sunset',
      emoji: '🌅',
      isDark: false,
      bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50',
      card: 'bg-white/95 border-orange-200',
      cardHover: 'hover:bg-orange-50/50 hover:border-orange-300',
      header: 'bg-white/95 border-orange-200',
      text: 'text-gray-900',
      textMuted: 'text-orange-700',
      input: 'bg-white border-orange-300 text-gray-900 focus:border-orange-500 focus:ring-orange-500',
      inputFocus: 'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
      buttonPrimary: 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white',
      buttonSecondary: 'bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSuccess: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accent: 'bg-orange-500',
      accentHover: 'hover:bg-orange-600',
      accentText: 'text-orange-600',
      accentLight: 'bg-orange-100 border-orange-300 text-orange-800',
      icon: 'text-orange-500',
      iconHover: 'hover:text-rose-500',
      iconActive: 'text-rose-500',
      badge: 'bg-orange-100 text-orange-700',
      badgeSuccess: 'bg-emerald-100 text-emerald-700',
      badgeWarning: 'bg-amber-100 text-amber-700',
      badgeError: 'bg-red-100 text-red-700',
      border: 'border-orange-200',
      borderHover: 'hover:border-orange-300',
      borderFocus: 'focus:border-orange-500',
      toggleOn: 'bg-gradient-to-r from-orange-500 to-rose-500',
      toggleOff: 'bg-orange-200',
      preview: 'from-orange-400 to-rose-500'
    },
    forest: {
      name: 'Forest',
      emoji: '🌲',
      isDark: true,
      bg: 'bg-[#1a2f1a]',
      card: 'bg-[#243524] border-[#2f4a2f]',
      cardHover: 'hover:bg-[#2a4029] hover:border-[#3a5a3a]',
      header: 'bg-[#243524] border-[#2f4a2f]',
      text: 'text-[#d4e6d4]',
      textMuted: 'text-[#8faa8f]',
      input: 'bg-[#2a4029] border-[#3a5a3a] text-[#d4e6d4] focus:border-emerald-400 focus:ring-emerald-400',
      inputFocus: 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      buttonSecondary: 'bg-[#2a4029] hover:bg-[#345034] text-[#b4d4b4] border border-[#3a5a3a]',
      buttonDanger: 'bg-red-600 hover:bg-red-500 text-white',
      buttonSuccess: 'bg-green-500 hover:bg-green-400 text-white',
      accent: 'bg-emerald-600',
      accentHover: 'hover:bg-emerald-500',
      accentText: 'text-emerald-400',
      accentLight: 'bg-emerald-950/50 border-emerald-800 text-emerald-300',
      icon: 'text-[#8faa8f]',
      iconHover: 'hover:text-emerald-400',
      iconActive: 'text-emerald-400',
      badge: 'bg-emerald-900/60 text-emerald-300',
      badgeSuccess: 'bg-green-900/60 text-green-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-red-900/60 text-red-300',
      border: 'border-[#2f4a2f]',
      borderHover: 'hover:border-[#3a5a3a]',
      borderFocus: 'focus:border-emerald-400',
      toggleOn: 'bg-emerald-600',
      toggleOff: 'bg-[#3a5a3a]',
      preview: 'from-emerald-500 to-green-700'
    },
    lavender: {
      name: 'Lavender',
      emoji: '💜',
      isDark: false,
      bg: 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50',
      card: 'bg-white/95 border-purple-200',
      cardHover: 'hover:bg-purple-50/50 hover:border-purple-300',
      header: 'bg-white/95 border-purple-200',
      text: 'text-gray-900',
      textMuted: 'text-purple-600',
      input: 'bg-white border-purple-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500',
      inputFocus: 'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
      buttonPrimary: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white',
      buttonSecondary: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSuccess: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accent: 'bg-purple-500',
      accentHover: 'hover:bg-purple-600',
      accentText: 'text-purple-600',
      accentLight: 'bg-purple-100 border-purple-300 text-purple-800',
      icon: 'text-purple-500',
      iconHover: 'hover:text-fuchsia-500',
      iconActive: 'text-fuchsia-500',
      badge: 'bg-purple-100 text-purple-700',
      badgeSuccess: 'bg-emerald-100 text-emerald-700',
      badgeWarning: 'bg-amber-100 text-amber-700',
      badgeError: 'bg-red-100 text-red-700',
      border: 'border-purple-200',
      borderHover: 'hover:border-purple-300',
      borderFocus: 'focus:border-purple-500',
      toggleOn: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
      toggleOff: 'bg-purple-200',
      preview: 'from-purple-500 to-fuchsia-500'
    },
    spaceGalaxy: {
      name: 'Space Galaxy',
      emoji: '🚀',
      isDark: true,
      isSpaceTheme: true,
      // Deep space backgrounds
      bg: 'bg-[#0a0e27]',
      card: 'bg-[#1a1f3a]/80 border-[#00d9ff]/20 backdrop-blur-xl',
      cardHover: 'hover:bg-[#1a1f3a]/90 hover:border-[#00d9ff]/40 hover:shadow-[0_0_30px_rgba(0,217,255,0.15)]',
      header: 'bg-[#0a0e27]/95 border-[#00d9ff]/20 backdrop-blur-xl',
      // Crisp text for readability
      text: 'text-[#f0f6ff]',
      textMuted: 'text-[#8892b0]',
      // Glowing inputs
      input: 'bg-[#0a0e27]/80 border-[#00d9ff]/30 text-[#f0f6ff] focus:border-[#00d9ff] focus:ring-[#00d9ff] focus:shadow-[0_0_20px_rgba(0,217,255,0.2)]',
      inputFocus: 'focus:border-[#00d9ff] focus:ring-2 focus:ring-[#00d9ff]/20',
      // Cosmic buttons with glow effects
      buttonPrimary: 'bg-gradient-to-r from-[#00d9ff] to-[#4d7cff] hover:from-[#00e5ff] hover:to-[#5d8cff] text-[#0a0e27] font-semibold shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:shadow-[0_0_30px_rgba(0,217,255,0.6)]',
      buttonSecondary: 'bg-[#1a1f3a]/60 hover:bg-[#00d9ff]/10 text-[#f0f6ff] border border-[#00d9ff]/30 hover:border-[#00d9ff]/60 backdrop-blur-sm',
      buttonDanger: 'bg-gradient-to-r from-[#ff3366] to-[#cc2952] hover:from-[#ff4477] hover:to-[#dd3a63] text-white shadow-[0_0_20px_rgba(255,51,102,0.4)]',
      buttonSuccess: 'bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ff99] hover:to-[#00dd7b] text-[#0a0e27] font-semibold shadow-[0_0_20px_rgba(0,255,136,0.4)]',
      // Cosmic accents
      accent: 'bg-[#00d9ff]',
      accentHover: 'hover:bg-[#00e5ff]',
      accentText: 'text-[#00d9ff]',
      accentLight: 'bg-[#00d9ff]/10 border-[#00d9ff]/30 text-[#00d9ff]',
      // Glowing icons
      icon: 'text-[#8892b0]',
      iconHover: 'hover:text-[#00d9ff] hover:drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]',
      iconActive: 'text-[#00d9ff] drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]',
      // Cosmic badges
      badge: 'bg-[#4d7cff]/20 text-[#4d7cff] border border-[#4d7cff]/30',
      badgeSuccess: 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]',
      badgeWarning: 'bg-[#ffaa00]/15 text-[#ffaa00] border border-[#ffaa00]/30',
      badgeError: 'bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/30',
      // Glowing borders
      border: 'border-[#00d9ff]/20',
      borderHover: 'hover:border-[#00d9ff]/40',
      borderFocus: 'focus:border-[#00d9ff]',
      // Cosmic toggles
      toggleOn: 'bg-gradient-to-r from-[#00d9ff] to-[#4d7cff] shadow-[0_0_15px_rgba(0,217,255,0.4)]',
      toggleOff: 'bg-[#1a1f3a] border border-[#00d9ff]/30',
      // Preview gradient
      preview: 'from-[#00d9ff] via-[#ff006e] to-[#4d7cff]'
    },
    cyberpunkNeon: {
      name: 'Cyberpunk',
      emoji: '⚡',
      isDark: true,
      isCyberpunkTheme: true,
      bg: 'bg-[#0a0a0a]',
      card: 'bg-[#0a0a0a]/95 border-[#ff006e]/40 backdrop-blur-sm',
      cardHover: 'hover:bg-[#1a0033]/80 hover:border-[#00f0ff]/60 hover:shadow-[0_0_30px_rgba(255,0,110,0.3)]',
      header: 'bg-[#0a0a0a]/98 border-[#ff006e]/30 backdrop-blur-sm',
      text: 'text-white',
      textMuted: 'text-[#00f0ff]',
      input: 'bg-[#0a0a0a]/90 border-b-2 border-[#00f0ff] text-[#00f0ff] focus:border-[#ff006e] focus:shadow-[0_2px_0_#ff006e,0_0_20px_rgba(255,0,110,0.3)]',
      inputFocus: 'focus:border-[#ff006e] focus:ring-0',
      buttonPrimary: 'bg-gradient-to-r from-[#ff006e] to-[#b400ff] hover:from-[#ff1a7a] hover:to-[#c41aff] text-white font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,110,0.5)] hover:shadow-[0_0_30px_rgba(255,0,110,0.7)]',
      buttonSecondary: 'bg-transparent hover:bg-[#ff006e]/20 text-white border-2 border-[#ff006e] hover:border-[#00f0ff] uppercase tracking-wider',
      buttonDanger: 'bg-gradient-to-r from-[#ff0266] to-[#ff006e] hover:from-[#ff1a7a] hover:to-[#ff1a8a] text-white shadow-[0_0_20px_rgba(255,2,102,0.5)]',
      buttonSuccess: 'bg-gradient-to-r from-[#39ff14] to-[#00ff41] hover:from-[#4dff28] hover:to-[#1aff55] text-[#0a0a0a] font-bold shadow-[0_0_20px_rgba(57,255,20,0.5)]',
      accent: 'bg-[#ff006e]',
      accentHover: 'hover:bg-[#ff1a7a]',
      accentText: 'text-[#ff006e]',
      accentLight: 'bg-[#ff006e]/10 border-[#ff006e]/30 text-[#ff006e]',
      icon: 'text-[#00f0ff]',
      iconHover: 'hover:text-[#ff006e] hover:drop-shadow-[0_0_8px_rgba(255,0,110,0.8)]',
      iconActive: 'text-[#ff006e] drop-shadow-[0_0_8px_rgba(255,0,110,0.8)]',
      badge: 'bg-[#b400ff]/20 text-[#b400ff] border border-[#b400ff]/40',
      badgeSuccess: 'bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/40 shadow-[0_0_10px_rgba(57,255,20,0.2)]',
      badgeWarning: 'bg-[#ffed00]/15 text-[#ffed00] border border-[#ffed00]/40',
      badgeError: 'bg-[#ff0266]/15 text-[#ff0266] border border-[#ff0266]/40',
      border: 'border-[#ff006e]/30',
      borderHover: 'hover:border-[#00f0ff]/60',
      borderFocus: 'focus:border-[#ff006e]',
      toggleOn: 'bg-gradient-to-r from-[#ff006e] to-[#00f0ff] shadow-[0_0_15px_rgba(255,0,110,0.5)]',
      toggleOff: 'bg-[#1a0033] border border-[#00f0ff]/40',
      preview: 'from-[#ff006e] via-[#b400ff] to-[#00f0ff]'
    },
    organicForest: {
      name: 'Organic Forest',
      emoji: '🌿',
      isDark: false,
      isForestTheme: true,
      bg: 'bg-[#faf8f3]',
      card: 'bg-gradient-to-br from-[#faf8f3] to-[#f5f0e8] border-[#4a7c39]/20',
      cardHover: 'hover:shadow-lg hover:shadow-[#4a7c39]/10 hover:border-[#4a7c39]/40',
      header: 'bg-[#faf8f3]/98 border-[#4a7c39]/20',
      text: 'text-[#2e2e2e]',
      textMuted: 'text-[#6b8e65]',
      input: 'bg-[#faf8f3] border-2 border-[#4a7c39]/30 text-[#2e2e2e] focus:border-[#4a7c39] focus:ring-[#4a7c39]/20',
      inputFocus: 'focus:border-[#4a7c39] focus:ring-2 focus:ring-[#4a7c39]/20',
      buttonPrimary: 'bg-gradient-to-r from-[#4a7c39] to-[#2d5016] hover:from-[#5a8c49] hover:to-[#3d6026] text-white shadow-md hover:shadow-lg',
      buttonSecondary: 'bg-[#faf8f3] hover:bg-[#4a7c39]/10 text-[#2d5016] border-2 border-[#4a7c39]/30 hover:border-[#4a7c39]/60',
      buttonDanger: 'bg-gradient-to-r from-[#e57373] to-[#d32f2f] hover:from-[#ef8a8a] hover:to-[#e33f3f] text-white',
      buttonSuccess: 'bg-gradient-to-r from-[#66bb6a] to-[#7cb342] hover:from-[#76cb7a] hover:to-[#8cc352] text-white',
      accent: 'bg-[#4a7c39]',
      accentHover: 'hover:bg-[#5a8c49]',
      accentText: 'text-[#2d5016]',
      accentLight: 'bg-[#4a7c39]/10 border-[#4a7c39]/30 text-[#2d5016]',
      icon: 'text-[#6b8e65]',
      iconHover: 'hover:text-[#4a7c39]',
      iconActive: 'text-[#2d5016]',
      badge: 'bg-[#4a7c39]/15 text-[#2d5016] border border-[#4a7c39]/30',
      badgeSuccess: 'bg-[#66bb6a]/15 text-[#2d5016] border border-[#66bb6a]/40',
      badgeWarning: 'bg-[#ffb74d]/20 text-[#8b6914] border border-[#ffb74d]/40',
      badgeError: 'bg-[#e57373]/15 text-[#c62828] border border-[#e57373]/40',
      border: 'border-[#4a7c39]/20',
      borderHover: 'hover:border-[#4a7c39]/40',
      borderFocus: 'focus:border-[#4a7c39]',
      toggleOn: 'bg-gradient-to-r from-[#4a7c39] to-[#7cb342]',
      toggleOff: 'bg-[#d7ccc8]',
      preview: 'from-[#2d5016] via-[#7cb342] to-[#fdd835]'
    },
    oceanUnderwater: {
      name: 'Ocean Depths',
      emoji: '🐠',
      isDark: true,
      isOceanTheme: true,
      bg: 'bg-gradient-to-b from-[#39cccc] via-[#0074d9] to-[#001f3f]',
      card: 'bg-white/10 border-white/20 backdrop-blur-xl',
      cardHover: 'hover:bg-white/15 hover:border-[#00fff7]/40 hover:shadow-[0_0_30px_rgba(0,255,247,0.15)]',
      header: 'bg-[#001f3f]/80 border-white/20 backdrop-blur-xl',
      text: 'text-white',
      textMuted: 'text-[#b2ebf2]',
      input: 'bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:border-[#00fff7] focus:ring-[#00fff7]/20',
      inputFocus: 'focus:border-[#00fff7] focus:ring-2 focus:ring-[#00fff7]/20',
      buttonPrimary: 'bg-gradient-to-r from-[#0074d9] to-[#39cccc] hover:from-[#0084e9] hover:to-[#49dcdc] text-white shadow-lg hover:shadow-xl',
      buttonSecondary: 'bg-white/15 hover:bg-[#00fff7]/20 text-white border border-white/30 hover:border-[#00fff7]/60 backdrop-blur-sm',
      buttonDanger: 'bg-gradient-to-r from-[#ff6b6b] to-[#ee5a52] hover:from-[#ff7b7b] hover:to-[#fe6a62] text-white',
      buttonSuccess: 'bg-gradient-to-r from-[#00ffcc] to-[#7fdbff] hover:from-[#1affdd] hover:to-[#8febff] text-[#001f3f] font-semibold',
      accent: 'bg-[#00fff7]',
      accentHover: 'hover:bg-[#1affff]',
      accentText: 'text-[#00fff7]',
      accentLight: 'bg-[#00fff7]/10 border-[#00fff7]/30 text-[#00fff7]',
      icon: 'text-[#7fdbff]',
      iconHover: 'hover:text-[#00fff7] hover:drop-shadow-[0_0_8px_rgba(0,255,247,0.6)]',
      iconActive: 'text-[#00fff7] drop-shadow-[0_0_8px_rgba(0,255,247,0.6)]',
      badge: 'bg-[#0074d9]/30 text-[#7fdbff] border border-[#7fdbff]/30',
      badgeSuccess: 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30',
      badgeWarning: 'bg-[#ffdc00]/15 text-[#ffdc00] border border-[#ffdc00]/30',
      badgeError: 'bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30',
      border: 'border-white/20',
      borderHover: 'hover:border-[#00fff7]/40',
      borderFocus: 'focus:border-[#00fff7]',
      toggleOn: 'bg-gradient-to-r from-[#39cccc] to-[#00fff7] shadow-[0_0_15px_rgba(0,255,247,0.4)]',
      toggleOff: 'bg-[#001f3f]/60 border border-white/30',
      preview: 'from-[#00fff7] via-[#0074d9] to-[#001f3f]'
    },
    steampunkVictorian: {
      name: 'Steampunk',
      emoji: '⚙️',
      isDark: true,
      isSteampunkTheme: true,
      bg: 'bg-gradient-to-br from-[#3e2723] via-[#2c2c2c] to-[#4a0e0e]',
      card: 'bg-gradient-to-br from-[#f4e7d7] to-[#faf0e6] border-[#b87333]/60',
      cardHover: 'hover:shadow-xl hover:shadow-[#b87333]/20 hover:border-[#d4af37]',
      header: 'bg-[#3e2723]/95 border-[#b87333]/40',
      text: 'text-[#1a1a1a]',
      textMuted: 'text-[#5d4037]',
      headerText: 'text-[#f4e7d7]',
      headerTextMuted: 'text-[#d4af37]',
      input: 'bg-[#f4e7d7] border-2 border-[#b87333]/50 text-[#1a1a1a] focus:border-[#d4af37] focus:ring-[#d4af37]/20',
      inputFocus: 'focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20',
      buttonPrimary: 'bg-gradient-to-r from-[#b87333] via-[#c87533] to-[#cd7f32] hover:from-[#d4af37] hover:via-[#b87333] hover:to-[#c87533] text-[#1a1a1a] font-semibold uppercase tracking-wider shadow-lg',
      buttonSecondary: 'bg-[#f4e7d7] hover:bg-[#d4af37]/20 text-[#3e2723] border-2 border-[#b87333]/50 hover:border-[#d4af37]',
      buttonDanger: 'bg-gradient-to-r from-[#b7410e] to-[#8b0000] hover:from-[#c7511e] hover:to-[#9b1010] text-white',
      buttonSuccess: 'bg-gradient-to-r from-[#6e8b3d] to-[#2c5f2d] hover:from-[#7e9b4d] hover:to-[#3c6f3d] text-white',
      accent: 'bg-[#d4af37]',
      accentHover: 'hover:bg-[#e4bf47]',
      accentText: 'text-[#b87333]',
      accentLight: 'bg-[#d4af37]/15 border-[#b87333]/40 text-[#8b4513]',
      icon: 'text-[#b87333]',
      iconHover: 'hover:text-[#d4af37]',
      iconActive: 'text-[#d4af37]',
      badge: 'bg-[#b87333]/20 text-[#8b4513] border border-[#b87333]/40',
      badgeSuccess: 'bg-[#6e8b3d]/20 text-[#2c5f2d] border border-[#6e8b3d]/40',
      badgeWarning: 'bg-[#ffbf00]/20 text-[#8b6914] border border-[#ffbf00]/40',
      badgeError: 'bg-[#b7410e]/20 text-[#8b0000] border border-[#b7410e]/40',
      border: 'border-[#b87333]/40',
      borderHover: 'hover:border-[#d4af37]',
      borderFocus: 'focus:border-[#d4af37]',
      toggleOn: 'bg-gradient-to-r from-[#b87333] to-[#d4af37]',
      toggleOff: 'bg-[#5a5a5a] border border-[#b87333]/40',
      preview: 'from-[#d4af37] via-[#b87333] to-[#3e2723]'
    }
  }

  const [selectedTheme, setSelectedTheme] = useState(() => {
    const saved = localStorage.getItem('crs-theme')
    return saved && THEMES[saved] ? saved : 'light'
  })

  // Backward compatibility helper
  const darkMode = THEMES[selectedTheme]?.isDark ?? false

  // Settings - merge saved with defaults to ensure new fields get default values
  const [settings, setSettings] = useState(() => {
    const defaults = {
      autoValidateCsv: true,
      showPreviewOnGenerate: false,
      defaultTaxYear: new Date().getFullYear().toString(),
      rememberLastOutput: true,
      animationsEnabled: true,
      partnerJurisdictions: DEFAULT_PARTNER_JURISDICTIONS
    }
    const saved = localStorage.getItem('crs-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Force reset partnerJurisdictions if it has more than 20 countries (old default)
      // This ensures users get the new 7-country default
      const shouldResetJurisdictions = !parsed.partnerJurisdictions || 
        parsed.partnerJurisdictions.length === 0 || 
        parsed.partnerJurisdictions.length > 20
      const jurisdictions = shouldResetJurisdictions 
        ? defaults.partnerJurisdictions 
        : parsed.partnerJurisdictions
      return { ...defaults, ...parsed, partnerJurisdictions: jurisdictions }
    }
    return defaults
  })
  
  // Partner jurisdictions search state
  const [jurisdictionSearch, setJurisdictionSearch] = useState('')
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false)

  // Form state (CRS)
  const [formData, setFormData] = useState({
    sendingCompanyIN: '',
    transmittingCountry: '',
    receivingCountry: '',
    reportingPeriod: new Date().getFullYear().toString(),
    numReportingFIs: '',
    reportingFITINs: [],
    individualAccounts: '',
    organisationAccounts: '',
    controllingPersons: '',
    accountHolderMode: 'random',
    accountHolderCountries: '',
    outputPath: ''
  })

  // FATCA Form state
  const [fatcaFormData, setFatcaFormData] = useState({
    sendingCompanyIN: '',  // GIIN format
    transmittingCountry: '',
    receivingCountry: 'US',  // Default to US for FATCA
    reportingPeriod: new Date().getFullYear().toString(),
    numReportingFIs: '1',
    reportingFITINs: [],
    filerCategory: 'FATCA601',
    individualAccounts: '',
    organisationAccounts: '',
    substantialOwners: '1',
    accountHolderMode: 'random',
    accountHolderCountries: '',
    outputPath: '',
    testMode: true
  })

  // FATCA Filer Categories
  const fatcaFilerCategories = [
    { value: 'FATCA601', label: 'FATCA601 - PFFI' },
    { value: 'FATCA602', label: 'FATCA602 - RDC FFI' },
    { value: 'FATCA603', label: 'FATCA603 - Limited Branch/FFI' },
    { value: 'FATCA604', label: 'FATCA604 - Reporting Model 2 FFI' },
    { value: 'FATCA605', label: 'FATCA605 - QI, WP, or WT' },
    { value: 'FATCA606', label: 'FATCA606 - Direct Reporting NFFE' },
    { value: 'FATCA607', label: 'FATCA607 - Sponsoring Entity (Sponsored FFI)' },
    { value: 'FATCA608', label: 'FATCA608 - Sponsoring Entity (Direct Reporting NFFE)' },
    { value: 'FATCA609', label: 'FATCA609 - Trustee-Documented Trust' },
    { value: 'FATCA610', label: 'FATCA610 - Withholding Agent' },
    { value: 'FATCA611', label: 'FATCA611 - Territory FI' }
  ]

  const [expandedSections, setExpandedSections] = useState({
    messageHeader: true,
    fileSize: true,
    accountHolder: false,
    output: true
  })

  const [errors, setErrors] = useState({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('success')
  const [modalMessage, setModalMessage] = useState('')
  
  // CSV mode state
  const [dataMode, setDataMode] = useState('random')
  const [csvFilePath, setCsvFilePath] = useState('')
  const [csvPreviewData, setCsvPreviewData] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [csvStatistics, setCsvStatistics] = useState(null)
  const [isValidatingCsv, setIsValidatingCsv] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  
  // Correction mode state
  const [correctionXmlPath, setCorrectionXmlPath] = useState('')
  const [correctionOutputPath, setCorrectionOutputPath] = useState('')
  const [xmlValidation, setXmlValidation] = useState(null)
  const [isValidatingXml, setIsValidatingXml] = useState(false)
  const [isGeneratingCorrection, setIsGeneratingCorrection] = useState(false)
  const [correctionOptions, setCorrectionOptions] = useState({
    correctFI: false,
    correctIndividual: 0,
    correctOrganisation: 0,
    deleteIndividual: 0,
    deleteOrganisation: 0,
    modifyBalance: true,
    modifyAddress: true,
    modifyName: false,
    testMode: true  // Use OECD11/12/13 for test data, OECD1/2/3 for production
  })
  const [showXmlErrorsModal, setShowXmlErrorsModal] = useState(false)
  
  // Correction CSV mode state
  const [correctionDataMode, setCorrectionDataMode] = useState('xml') // 'xml' or 'csv'
  const [correctionCsvPath, setCorrectionCsvPath] = useState('')
  const [correctionCsvPreview, setCorrectionCsvPreview] = useState(null)
  const [showCorrectionCsvPreview, setShowCorrectionCsvPreview] = useState(false)
  
  // CRS701 CSV template preview modal state
  const [showCrs701CsvPreview, setShowCrs701CsvPreview] = useState(false)
  
  // Global statistics and history
  const [globalStats, setGlobalStats] = useState(() => {
    const saved = localStorage.getItem('crs-global-stats')
    return saved ? JSON.parse(saved) : {
      totalXmlGenerated: 0,
      totalCsvUploaded: 0,
      totalCsvDownloaded: 0,
      totalPreviewsGenerated: 0,
      totalIndividualAccounts: 0,
      totalOrganisationAccounts: 0,
      totalReportingFIs: 0,
      totalValidationErrors: 0,
      totalCorrectionsGenerated: 0,
      lastGenerated: null
    }
  })
  
  const [fileHistory, setFileHistory] = useState(() => {
    const saved = localStorage.getItem('crs-file-history')
    return saved ? JSON.parse(saved) : []
  })

  // Apply theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('crs-theme', selectedTheme)
  }, [selectedTheme, darkMode])

  // Save settings
  useEffect(() => {
    localStorage.setItem('crs-settings', JSON.stringify(settings))
  }, [settings])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const updateStats = (updates) => {
    setGlobalStats(prev => {
      const newStats = { ...prev, ...updates }
      localStorage.setItem('crs-global-stats', JSON.stringify(newStats))
      return newStats
    })
  }

  const addToHistory = (entry) => {
    setFileHistory(prev => {
      const newHistory = [entry, ...prev].slice(0, 100)
      localStorage.setItem('crs-file-history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const deleteHistoryEntry = (id) => {
    setFileHistory(prev => {
      const newHistory = prev.filter(entry => entry.id !== id)
      localStorage.setItem('crs-file-history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearAllHistory = () => {
    setFileHistory([])
    localStorage.removeItem('crs-file-history')
  }

  const resetAllStats = () => {
    const resetStats = {
      totalXmlGenerated: 0,
      totalCsvUploaded: 0,
      totalCsvDownloaded: 0,
      totalPreviewsGenerated: 0,
      totalIndividualAccounts: 0,
      totalOrganisationAccounts: 0,
      totalReportingFIs: 0,
      totalValidationErrors: 0,
      lastGenerated: null
    }
    setGlobalStats(resetStats)
    localStorage.setItem('crs-global-stats', JSON.stringify(resetStats))
  }

  const handleNumFIsChange = (value) => {
    const num = parseInt(value) || 0
    if (num < 1 && value !== '') return
    handleInputChange('numReportingFIs', value)
    if (num >= 1) {
      const tins = Array(num).fill('')
      setFormData(prev => ({ ...prev, reportingFITINs: tins }))
    } else {
      setFormData(prev => ({ ...prev, reportingFITINs: [] }))
    }
  }

  const handleTINChange = (index, value) => {
    const newTINs = [...formData.reportingFITINs]
    newTINs[index] = value
    setFormData(prev => ({ ...prev, reportingFITINs: newTINs }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.sendingCompanyIN) newErrors.sendingCompanyIN = 'Required'
    if (!formData.transmittingCountry) {
      newErrors.transmittingCountry = 'Required'
    } else if (!/^[A-Z]{2}$/.test(formData.transmittingCountry.toUpperCase())) {
      newErrors.transmittingCountry = 'Must be 2-letter ISO code'
    }
    if (!formData.receivingCountry) {
      newErrors.receivingCountry = 'Required'
    } else if (!/^[A-Z]{2}$/.test(formData.receivingCountry.toUpperCase())) {
      newErrors.receivingCountry = 'Must be 2-letter ISO code'
    }
    if (!formData.numReportingFIs || parseInt(formData.numReportingFIs) < 1) {
      newErrors.numReportingFIs = 'Must be at least 1'
    }
    if (parseInt(formData.numReportingFIs) >= 1) {
      formData.reportingFITINs.forEach((tin, index) => {
        if (!tin) newErrors[`tin_${index}`] = 'Required'
      })
    }
    if (!formData.outputPath) newErrors.outputPath = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSelectOutputFile = async () => {
    const filePath = await window.electronAPI.selectOutputFile()
    if (filePath) handleInputChange('outputPath', filePath)
  }

  const handleSelectCsvFile = async () => {
    const filePath = await window.electronAPI.selectCsvFile()
    if (filePath) {
      setCsvFilePath(filePath)
      setErrors(prev => ({ ...prev, csvFilePath: null }))
      
      if (settings.autoValidateCsv) {
        setIsValidatingCsv(true)
        setCsvStatistics(null)
        
        try {
          const result = await window.electronAPI.validateCsv(filePath)
          
          if (result.valid) {
            setCsvStatistics(result.statistics)
            setModalType('success')
            setModalMessage(`CSV validated! ${result.statistics.total_accounts} accounts found.`)
            setShowModal(true)
          } else {
            setValidationErrors(result.errors)
            updateStats({ totalValidationErrors: globalStats.totalValidationErrors + result.errors.length })
            setShowValidationModal(true)
            setCsvFilePath('')
          }
        } catch (error) {
          setModalType('error')
          setModalMessage(`Validation failed: ${error.message}`)
          setShowModal(true)
          setCsvFilePath('')
        } finally {
          setIsValidatingCsv(false)
        }
      }
    }
  }

  const handleClearCsvFile = () => {
    setCsvFilePath('')
    setCsvStatistics(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      const filePath = await window.electronAPI.downloadCsvTemplate()
      if (filePath) {
        setModalType('success')
        setModalMessage(`Template saved to: ${filePath}`)
        setShowModal(true)
      }
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed: ${error.message}`)
      setShowModal(true)
    }
  }

  const handleGeneratePreview = async () => {
    if (!formData.sendingCompanyIN || !formData.transmittingCountry || !formData.receivingCountry || !formData.numReportingFIs) {
      setModalType('error')
      setModalMessage('Please fill in required fields first.')
      setShowModal(true)
      return
    }
    setIsLoadingPreview(true)
    try {
      const result = await window.electronAPI.generateCsvPreview({
        transmittingCountry: formData.transmittingCountry.toUpperCase(),
        receivingCountry: formData.receivingCountry.toUpperCase(),
        reportingPeriod: formData.reportingPeriod,
        sendingCompanyIN: formData.sendingCompanyIN,
        numReportingFIs: formData.numReportingFIs,
        individualAccounts: formData.individualAccounts || '0',
        organisationAccounts: formData.organisationAccounts || '0',
        controllingPersons: formData.controllingPersons || '1'
      })
      setCsvPreviewData(result)
      setShowPreviewModal(true)
      updateStats({ totalPreviewsGenerated: globalStats.totalPreviewsGenerated + 1 })
    } catch (error) {
      setModalType('error')
      setModalMessage(`Preview failed: ${error.message}`)
      setShowModal(true)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleDownloadCsv = async () => {
    if (!formData.sendingCompanyIN || !formData.transmittingCountry || !formData.receivingCountry || !formData.numReportingFIs) {
      setModalType('error')
      setModalMessage('Please fill in required fields first.')
      setShowModal(true)
      return
    }
    try {
      const result = await window.electronAPI.saveCsvPreview({
        transmittingCountry: formData.transmittingCountry.toUpperCase(),
        receivingCountry: formData.receivingCountry.toUpperCase(),
        reportingPeriod: formData.reportingPeriod,
        sendingCompanyIN: formData.sendingCompanyIN,
        numReportingFIs: formData.numReportingFIs,
        individualAccounts: formData.individualAccounts || '0',
        organisationAccounts: formData.organisationAccounts || '0',
        controllingPersons: formData.controllingPersons || '1'
      })
      if (result) {
        updateStats({ totalCsvDownloaded: globalStats.totalCsvDownloaded + 1 })
        const individualCount = (parseInt(formData.individualAccounts) || 0) * parseInt(formData.numReportingFIs)
        const organisationCount = (parseInt(formData.organisationAccounts) || 0) * parseInt(formData.numReportingFIs)
        addToHistory({
          id: Date.now().toString(),
          type: 'csv',
          mode: 'preview',
          fileName: result.filePath.split(/[\\/]/).pop(),
          filePath: result.filePath,
          fileSize: 0,
          timestamp: new Date().toISOString(),
          accounts: individualCount + organisationCount,
          individualAccounts: individualCount,
          organisationAccounts: organisationCount,
          reportingFIs: parseInt(formData.numReportingFIs)
        })
        setModalType('success')
        setModalMessage(`CSV saved to: ${result.filePath}`)
        setShowModal(true)
      }
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed: ${error.message}`)
      setShowModal(true)
    }
  }

  const validateCsvForm = () => {
    const newErrors = {}
    if (!csvFilePath) newErrors.csvFilePath = 'Please select a CSV file'
    if (!formData.outputPath) newErrors.outputPath = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Correction mode handlers
  const handleSelectXmlFile = async () => {
    const filePath = await window.electronAPI.selectXmlFile()
    if (filePath) {
      setCorrectionXmlPath(filePath)
      setXmlValidation(null)
      setIsValidatingXml(true)
      
      try {
        const result = await window.electronAPI.validateXml(filePath)
        setXmlValidation(result)
        
        if (!result.is_valid) {
          updateStats({ totalValidationErrors: globalStats.totalValidationErrors + result.errors.length })
        }
        
        if (result.is_correction_file) {
          setModalType('error')
          setModalMessage('This is already a correction file (CRS702). Please select a new file (CRS701).')
          setShowModal(true)
          setCorrectionXmlPath('')
          setXmlValidation(null)
        }
      } catch (error) {
        setModalType('error')
        setModalMessage(`Validation failed: ${error.message}`)
        setShowModal(true)
        setCorrectionXmlPath('')
      } finally {
        setIsValidatingXml(false)
      }
    }
  }

  const handleClearXmlFile = () => {
    setCorrectionXmlPath('')
    setXmlValidation(null)
    setCorrectionOptions({
      correctFI: false,
      correctIndividual: 0,
      correctOrganisation: 0,
      deleteIndividual: 0,
      deleteOrganisation: 0,
      modifyBalance: true,
      modifyAddress: true,
      modifyName: false,
      testMode: true
    })
  }

  const handleSelectCorrectionOutput = async () => {
    const filePath = await window.electronAPI.selectCorrectionOutput()
    if (filePath) {
      setCorrectionOutputPath(filePath)
    }
  }

  const handleGenerateCorrection = async () => {
    if (!correctionXmlPath || !xmlValidation?.can_generate_correction) {
      setModalType('error')
      setModalMessage('Please select and validate a valid CRS701 XML file first.')
      setShowModal(true)
      return
    }
    
    if (!correctionOutputPath) {
      setModalType('error')
      setModalMessage('Please select an output location.')
      setShowModal(true)
      return
    }
    
    const totalCorrections = correctionOptions.correctIndividual + correctionOptions.correctOrganisation
    const totalDeletions = correctionOptions.deleteIndividual + correctionOptions.deleteOrganisation
    
    if (totalCorrections === 0 && totalDeletions === 0 && !correctionOptions.correctFI) {
      setModalType('error')
      setModalMessage('Please select at least one correction or deletion option.')
      setShowModal(true)
      return
    }
    
    setIsGeneratingCorrection(true)
    
    try {
      const result = await window.electronAPI.generateCorrection({
        xmlPath: correctionXmlPath,
        outputPath: correctionOutputPath,
        ...correctionOptions
      })
      
      updateStats({
        totalCorrectionsGenerated: globalStats.totalCorrectionsGenerated + 1,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'correction',
        mode: 'correction',
        fileName: correctionOutputPath.split(/[\\/]/).pop(),
        filePath: correctionOutputPath,
        fileSize: 0,
        timestamp: new Date().toISOString(),
        accounts: result.corrections_made + result.deletions_made,
        individualAccounts: correctionOptions.correctIndividual + correctionOptions.deleteIndividual,
        organisationAccounts: correctionOptions.correctOrganisation + correctionOptions.deleteOrganisation,
        reportingFIs: correctionOptions.correctFI ? 1 : 0,
        corrections: result.corrections_made,
        deletions: result.deletions_made
      })
      
      setModalType('success')
      setModalMessage(`Correction file generated!\n\nCorrections: ${result.corrections_made}\nDeletions: ${result.deletions_made}${result.fi_corrected ? '\nFI Corrected: Yes' : ''}`)
      setShowModal(true)
      
      // Reset form
      handleClearXmlFile()
      setCorrectionOutputPath('')
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed to generate correction: ${error.message}`)
      setShowModal(true)
    } finally {
      setIsGeneratingCorrection(false)
    }
  }

  // FATCA Generate handler
  const handleGenerateFATCA = async () => {
    // Basic validation
    if (!fatcaFormData.transmittingCountry || !fatcaFormData.outputPath) {
      setModalType('error')
      setModalMessage('Please fill in required fields (Transmitting Country and Output Path)')
      setShowModal(true)
      return
    }

    setIsGenerating(true)
    setGenerationProgress('Initializing FATCA generation...')

    try {
      window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      const generateData = {
        ...fatcaFormData,
        transmittingCountry: fatcaFormData.transmittingCountry.toUpperCase(),
        receivingCountry: fatcaFormData.receivingCountry.toUpperCase(),
        numReportingFIs: parseInt(fatcaFormData.numReportingFIs) || 1,
        individualAccounts: parseInt(fatcaFormData.individualAccounts) || 0,
        organisationAccounts: parseInt(fatcaFormData.organisationAccounts) || 0,
        substantialOwners: parseInt(fatcaFormData.substantialOwners) || 1
      }

      const result = await window.electronAPI.generateFATCA(generateData)
      setGenerationProgress('')
      
      const individualCount = parseInt(fatcaFormData.individualAccounts) || 0
      const organisationCount = parseInt(fatcaFormData.organisationAccounts) || 0
      const fiCount = parseInt(fatcaFormData.numReportingFIs) || 1
      
      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        totalIndividualAccounts: globalStats.totalIndividualAccounts + individualCount,
        totalOrganisationAccounts: globalStats.totalOrganisationAccounts + organisationCount,
        totalReportingFIs: globalStats.totalReportingFIs + fiCount,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'fatca-xml',
        mode: 'random',
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        accounts: individualCount + organisationCount,
        individualAccounts: individualCount,
        organisationAccounts: organisationCount,
        reportingFIs: fiCount
      })
      
      setModalType('success')
      setModalMessage(`FATCA XML generated successfully!\nSize: ${result.fileSize} MB`)
      setShowModal(true)
    } catch (error) {
      setGenerationProgress('')
      setModalType('error')
      setModalMessage(error.message || 'An error occurred')
      setShowModal(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (dataMode === 'csv') {
      if (!validateCsvForm()) return
    } else {
      if (!validateForm()) return
    }

    setIsGenerating(true)
    setGenerationProgress('Initializing...')

    try {
      window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      let generateData
      if (dataMode === 'csv') {
        generateData = { mode: 'csv', csvPath: csvFilePath, outputPath: formData.outputPath }
      } else {
        generateData = {
          mode: 'random',
          ...formData,
          transmittingCountry: formData.transmittingCountry.toUpperCase(),
          receivingCountry: formData.receivingCountry.toUpperCase(),
          numReportingFIs: parseInt(formData.numReportingFIs),
          individualAccounts: parseInt(formData.individualAccounts) || 0,
          organisationAccounts: parseInt(formData.organisationAccounts) || 0,
          controllingPersons: parseInt(formData.controllingPersons) || 0
        }
      }

      const result = await window.electronAPI.generateCRS(generateData)
      setGenerationProgress('')
      
      const individualCount = dataMode === 'csv' ? (csvStatistics?.individual_accounts || 0) : (parseInt(formData.individualAccounts) || 0) * parseInt(formData.numReportingFIs)
      const organisationCount = dataMode === 'csv' ? (csvStatistics?.organisation_accounts || 0) : (parseInt(formData.organisationAccounts) || 0) * parseInt(formData.numReportingFIs)
      const fiCount = dataMode === 'csv' ? (csvStatistics?.reporting_fis || 0) : parseInt(formData.numReportingFIs)
      
      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        totalCsvUploaded: dataMode === 'csv' ? globalStats.totalCsvUploaded + 1 : globalStats.totalCsvUploaded,
        totalIndividualAccounts: globalStats.totalIndividualAccounts + individualCount,
        totalOrganisationAccounts: globalStats.totalOrganisationAccounts + organisationCount,
        totalReportingFIs: globalStats.totalReportingFIs + fiCount,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'xml',
        mode: dataMode,
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        accounts: individualCount + organisationCount,
        individualAccounts: individualCount,
        organisationAccounts: organisationCount,
        reportingFIs: fiCount
      })
      
      setModalType('success')
      setModalMessage(`Generated successfully!\nSize: ${result.fileSize} MB`)
      setShowModal(true)
    } catch (error) {
      setGenerationProgress('')
      setModalType('error')
      setModalMessage(error.message || 'An error occurred')
      setShowModal(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 10 + i)

  // Theme classes - use selected theme
  const theme = THEMES[selectedTheme] || THEMES.light

  // Module configuration
  const modules = {
    crs: {
      name: 'CRS',
      fullName: 'Common Reporting Standard',
      description: 'Generate CRS XML test data for automatic exchange of financial account information',
      icon: Globe,
      features: ['Individual & Organisation Accounts', 'Controlling Persons', 'Corrections & Deletions', 'CSV Import/Export']
    },
    fatca: {
      name: 'FATCA',
      fullName: 'Foreign Account Tax Compliance Act',
      description: 'Generate FATCA XML test data for US tax compliance reporting',
      icon: DollarSign,
      features: ['Individual & Organisation Accounts', 'Substantial Owners', 'Corrections & Deletions', 'Filer Categories']
    }
  }

  // Theme Background Component - handles all immersive theme backgrounds
  const ThemeBackground = () => {
    const [particles, setParticles] = useState([])
    
    useEffect(() => {
      if (!settings.animationsEnabled) return
      
      // Space Galaxy - shooting stars
      if (theme.isSpaceTheme) {
        const spawnStar = () => {
          const id = Date.now()
          setParticles(prev => [...prev, { id, type: 'star', top: Math.random() * 50 + '%', left: Math.random() * 50 + '%' }])
          setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 1500)
        }
        const interval = setInterval(spawnStar, 4000 + Math.random() * 4000)
        return () => clearInterval(interval)
      }
      
      // Ocean - bubbles
      if (theme.isOceanTheme) {
        const spawnBubble = () => {
          const id = Date.now()
          setParticles(prev => [...prev, { id, type: 'bubble', left: Math.random() * 100 + '%', size: 10 + Math.random() * 20, delay: Math.random() * 2 }])
          setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 8000)
        }
        const interval = setInterval(spawnBubble, 1500)
        return () => clearInterval(interval)
      }
      
      // Forest - falling leaves
      if (theme.isForestTheme) {
        const leaves = ['🍃', '🌿', '🍂', '🌱']
        const spawnLeaf = () => {
          const id = Date.now()
          setParticles(prev => [...prev, { id, type: 'leaf', left: Math.random() * 100 + '%', emoji: leaves[Math.floor(Math.random() * leaves.length)], delay: Math.random() * 5 }])
          setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 20000)
        }
        const interval = setInterval(spawnLeaf, 3000)
        return () => clearInterval(interval)
      }
    }, [theme.isSpaceTheme, theme.isOceanTheme, theme.isForestTheme, settings.animationsEnabled])
    
    // Space Galaxy Theme
    if (theme.isSpaceTheme) {
      return (
        <>
          <div className="space-galaxy-bg" />
          <div className="space-galaxy-stars" />
          <div className="space-galaxy-nebula" />
          {particles.filter(p => p.type === 'star').map(star => (
            <div key={star.id} className="space-galaxy-shooting-star active" style={{ top: star.top, left: star.left }} />
          ))}
        </>
      )
    }
    
    // Cyberpunk Theme
    if (theme.isCyberpunkTheme) {
      return (
        <>
          <div className="cyberpunk-bg" />
          <div className="cyberpunk-grid" />
          <div className="cyberpunk-scanlines" />
        </>
      )
    }
    
    // Forest Theme
    if (theme.isForestTheme) {
      return (
        <>
          <div className="forest-bg" />
          <div className="forest-sunlight" />
          <div className="forest-leaves">
            {particles.filter(p => p.type === 'leaf').map(leaf => (
              <div key={leaf.id} className="forest-leaf" style={{ left: leaf.left, animationDelay: `${leaf.delay}s` }}>{leaf.emoji}</div>
            ))}
          </div>
        </>
      )
    }
    
    // Ocean Theme
    if (theme.isOceanTheme) {
      return (
        <>
          <div className="ocean-bg" />
          <div className="ocean-caustics" />
          <div className="ocean-bubbles">
            {particles.filter(p => p.type === 'bubble').map(bubble => (
              <div key={bubble.id} className="ocean-bubble" style={{ left: bubble.left, width: bubble.size, height: bubble.size, animationDelay: `${bubble.delay}s` }} />
            ))}
          </div>
        </>
      )
    }
    
    // Steampunk Theme
    if (theme.isSteampunkTheme) {
      return (
        <>
          <div className="steampunk-bg" />
          <div className="steampunk-panels" />
          <div className="steampunk-gears">
            <div className="steampunk-gear" style={{ width: 120, height: 120, top: '10%', right: '5%' }} />
            <div className="steampunk-gear reverse" style={{ width: 80, height: 80, top: '15%', right: '12%' }} />
            <div className="steampunk-gear" style={{ width: 100, height: 100, bottom: '20%', left: '8%' }} />
          </div>
        </>
      )
    }
    
    return null
  }

  // Get theme class for body
  const getThemeClass = () => {
    if (theme.isSpaceTheme) return 'space-galaxy'
    if (theme.isCyberpunkTheme) return 'cyberpunk-neon'
    if (theme.isForestTheme) return 'organic-forest'
    if (theme.isOceanTheme) return 'ocean-underwater'
    if (theme.isSteampunkTheme) return 'steampunk-victorian'
    return ''
  }

  // Module selection screen
  if (!activeModule) {
    return (
      <div className={`min-h-screen ${theme.bg} transition-colors duration-300 ${getThemeClass()}`}>
        {/* Theme Background */}
        <ThemeBackground />
        {/* Simple header for module selection */}
        <header className={`${theme.header} border-b shadow-sm`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${theme.gradient || theme.buttonPrimary} flex items-center justify-center shadow-lg`}>
                  <Landmark className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${theme.headerText || theme.text}`}>Tax Reporting Generator</h1>
                  <p className={`text-sm ${theme.headerTextMuted || theme.textMuted}`}>Generate compliant XML test data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveModule('crs')
                    setCurrentPage('settings')
                  }}
                  className={`p-2 rounded-lg transition-all ${theme.buttonSecondary}`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const themeKeys = Object.keys(THEMES)
                    const currentIndex = themeKeys.indexOf(selectedTheme)
                    const nextIndex = (currentIndex + 1) % themeKeys.length
                    setSelectedTheme(themeKeys[nextIndex])
                  }}
                  className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${theme.buttonSecondary}`}
                  title="Click to change theme"
                >
                  <span>{theme.emoji}</span>
                  <span className="text-sm font-medium hidden sm:inline">{theme.name}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Module Selection */}
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold ${theme.headerText || theme.text} mb-3`}>Select a Module</h2>
            <p className={`text-lg ${theme.headerTextMuted || theme.textMuted}`}>Choose the reporting standard you want to work with</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(modules).map(([key, module]) => {
              const Icon = module.icon
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveModule(key)
                    setCurrentPage('generator')
                  }}
                  className={`${theme.card} rounded-2xl border p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left group hover:scale-[1.02] ${
                    settings.animationsEnabled ? 'animate-fade-in' : ''
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl ${theme.card} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform border-2 ${theme.border}`}>
                    <Icon className={`w-8 h-8 ${theme.accentText}`} />
                  </div>
                  <h3 className={`text-2xl font-bold ${theme.text} mb-1`}>{module.name}</h3>
                  <p className={`text-sm ${theme.textMuted} mb-4`}>{module.fullName}</p>
                  <p className={`${theme.textMuted} mb-6`}>{module.description}</p>
                  <div className="space-y-2">
                    {module.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${theme.accentText}`} />
                        <span className={`text-sm ${theme.text}`}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-6 py-3 px-4 rounded-lg ${theme.buttonPrimary} font-semibold text-center group-hover:opacity-90 transition-opacity border-2 ${theme.border}`}>
                    Open {module.name} Module
                  </div>
                </button>
              )
            })}
          </div>

          {/* Coming Soon */}
          <div className="mt-12 text-center">
            <p className={`${theme.textMuted} text-sm mb-4`}>More modules coming soon</p>
            <div className="flex justify-center gap-4">
              {[
                { name: 'CBC', desc: 'Country-by-Country Reporting' },
                { name: 'NTJ', desc: 'Non-Tax Jurisdiction' }
              ].map((m) => (
                <div key={m.name} className={`${theme.card} rounded-lg border px-4 py-2 opacity-50`}>
                  <span className={`font-medium ${theme.text}`}>{m.name}</span>
                  <span className={`text-xs ${theme.textMuted} ml-2`}>{m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Get current module config
  const currentModule = modules[activeModule]
  const ModuleIcon = currentModule?.icon || Globe

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 ${getThemeClass()}`}>
      {/* Theme Background */}
      <ThemeBackground />
      {/* Header */}
      <header className={`${theme.header} border-b shadow-sm sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back to module selection */}
              <button
                onClick={() => setActiveModule(null)}
                className={`p-2 rounded-lg transition-colors ${theme.buttonSecondary}`}
                title="Back to module selection"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentModule.color} flex items-center justify-center shadow-lg`}>
                <ModuleIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme.text}`}>{currentModule.name} Generator</h1>
                <p className={`text-xs ${theme.textMuted}`}>{currentModule.fullName}</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {[
                { id: 'generator', icon: Rocket, label: 'Generator' },
                { id: 'corrections', icon: FileEdit, label: 'Corrections' },
                { id: 'history', icon: History, label: 'History' },
                { id: 'settings', icon: Settings, label: 'Settings' }
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setCurrentPage(id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    currentPage === id
                      ? `${currentModule.bgColor} text-white shadow-md`
                      : `${theme.icon} ${theme.iconHover} ${theme.cardHover}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Theme toggle */}
            <button
              onClick={() => {
                const themeKeys = Object.keys(THEMES)
                const currentIndex = themeKeys.indexOf(selectedTheme)
                const nextIndex = (currentIndex + 1) % themeKeys.length
                setSelectedTheme(themeKeys[nextIndex])
              }}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${theme.buttonSecondary}`}
              title="Click to change theme"
            >
              <span>{theme.emoji}</span>
              <span className="text-sm font-medium hidden sm:inline">{theme.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* FATCA Generator Page */}
        {currentPage === 'generator' && activeModule === 'fatca' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* FATCA Message Header */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-green-500`}>
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>FATCA Message Header</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Sending Company GIIN *</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="000000.00000.TA.531"
                    value={fatcaFormData.sendingCompanyIN}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, sendingCompanyIN: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Transmitting Country *</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="NL"
                    maxLength={2}
                    value={fatcaFormData.transmittingCountry}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, transmittingCountry: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Receiving Country</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input} opacity-60`}
                    value={fatcaFormData.receivingCountry}
                    readOnly
                  />
                  <p className={`text-xs ${theme.textMuted} mt-1`}>Always US for FATCA</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Reporting Period (Year)</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.reportingPeriod}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, reportingPeriod: e.target.value})}
                  >
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* FATCA Reporting FI */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-green-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Building2 className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Reporting Financial Institution</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Number of Reporting FIs</label>
                  <input
                    type="number"
                    min="1"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.numReportingFIs}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, numReportingFIs: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Filer Category *</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.filerCategory}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, filerCategory: e.target.value})}
                  >
                    {fatcaFilerCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* FATCA Account Configuration */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-green-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Users className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Account Configuration</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Individual Accounts</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="0"
                    value={fatcaFormData.individualAccounts}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, individualAccounts: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Organisation Accounts</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="0"
                    value={fatcaFormData.organisationAccounts}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, organisationAccounts: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Substantial Owners per Org</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.substantialOwners}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, substantialOwners: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fatcaFormData.testMode}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, testMode: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className={`text-sm ${theme.text}`}>Test Mode (FATCA11-14 indicators)</span>
                </label>
              </div>
            </div>

            {/* FATCA Output */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-green-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Save className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`flex-1 px-4 py-2 rounded-lg border ${theme.input}`}
                  placeholder="Select output file location..."
                  value={fatcaFormData.outputPath}
                  readOnly
                />
                <button
                  onClick={async () => {
                    const result = await window.electronAPI.selectOutputFile()
                    if (result) setFatcaFormData({...fatcaFormData, outputPath: result})
                  }}
                  className={`px-4 py-2 ${theme.buttonSuccess} font-medium rounded-lg transition-colors flex items-center gap-2`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>

            {/* FATCA Generate Button */}
            <button
              onClick={handleGenerateFATCA}
              disabled={isGenerating}
              className={`w-full py-4 ${theme.buttonSuccess} disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Generating FATCA XML...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-6 h-6" />
                  <span>Generate FATCA XML</span>
                </>
              )}
            </button>

            {generationProgress && (
              <div className={`${theme.card} rounded-lg border p-4`}>
                <p className={`text-sm ${theme.textMuted}`}>{generationProgress}</p>
              </div>
            )}
          </div>
        )}

        {/* CRS Generator Page */}
        {currentPage === 'generator' && activeModule === 'crs' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Data Source Toggle */}
            <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${theme.text}`}>Data Source:</span>
                <div className="flex gap-2">
                  {[
                    { id: 'random', icon: Sparkles, label: 'Random Data' },
                    { id: 'csv', icon: Upload, label: 'Upload CSV' }
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setDataMode(id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                        dataMode === id
                          ? `${theme.buttonPrimary} shadow-md`
                          : theme.buttonSecondary
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CSV Upload Section */}
            {dataMode === 'csv' && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-green-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <Upload className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Upload CSV File</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-lg border ${theme.input} ${
                          errors.csvFilePath ? 'border-red-500' : csvFilePath && csvStatistics ? 'border-green-500' : ''
                        }`}
                        placeholder="Select CSV file..."
                        value={csvFilePath}
                        readOnly
                      />
                      {csvFilePath && (
                        <button
                          onClick={handleClearCsvFile}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.icon} hover:text-red-500 transition-colors`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleSelectCsvFile}
                      disabled={isValidatingCsv}
                      className={`px-6 py-3 ${theme.buttonSuccess} disabled:opacity-50 font-medium rounded-lg transition-colors flex items-center gap-2`}
                    >
                      {isValidatingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                      {isValidatingCsv ? 'Validating...' : 'Browse'}
                    </button>
                  </div>
                  
                  {errors.csvFilePath && <p className="text-sm text-red-500">{errors.csvFilePath}</p>}
                  
                  {csvFilePath && csvStatistics && (
                    <div className={`${theme.badgeSuccess} border rounded-lg p-4`}>
                      <div className={`flex items-center gap-2 font-medium mb-2 ${theme.accentText}`}>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CSV Validated</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div><span className={theme.textMuted}>Accounts:</span> <strong className={theme.text}>{csvStatistics.total_accounts}</strong></div>
                        <div><span className={theme.textMuted}>Individual:</span> <strong className={theme.text}>{csvStatistics.individual_accounts}</strong></div>
                        <div><span className={theme.textMuted}>Organisation:</span> <strong className={theme.text}>{csvStatistics.organisation_accounts}</strong></div>
                        <div><span className={theme.textMuted}>FIs:</span> <strong className={theme.text}>{csvStatistics.reporting_fis}</strong></div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCrs701CsvPreview(true)}
                      className={`text-sm px-3 py-1.5 ${theme.buttonSuccess} rounded-lg flex items-center gap-1`}
                    >
                      <Eye className="w-4 h-4" />
                      Preview & Download Template
                    </button>
                  </div>
                  <p className={`text-xs ${theme.textMuted}`}>
                    View the required CSV format and download a template file for CRS 701 data.
                  </p>
                </div>
              </div>
            )}

            {/* Random Data Form */}
            {dataMode === 'random' && (
              <>
                {/* Message Header */}
                <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                  <button
                    onClick={() => toggleSection('messageHeader')}
                    className={`w-full px-6 py-4 flex items-center justify-between ${theme.cardHover} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary-600" />
                      <span className={`font-semibold ${theme.text}`}>Message Header</span>
                    </div>
                    {expandedSections.messageHeader ? <ChevronUp className={theme.textMuted} /> : <ChevronDown className={theme.textMuted} />}
                  </button>
                  
                  {expandedSections.messageHeader && (
                    <div className="px-6 pb-6 grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Sending Company IN *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.sendingCompanyIN ? 'border-red-500' : ''}`}
                          value={formData.sendingCompanyIN}
                          onChange={(e) => handleInputChange('sendingCompanyIN', e.target.value)}
                          placeholder="e.g., 12345678"
                        />
                        {errors.sendingCompanyIN && <p className="text-xs text-red-500 mt-1">{errors.sendingCompanyIN}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Tax Year *</label>
                        <select
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                          value={formData.reportingPeriod}
                          onChange={(e) => handleInputChange('reportingPeriod', e.target.value)}
                        >
                          {years.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Transmitting Country *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.transmittingCountry ? 'border-red-500' : ''}`}
                          value={formData.transmittingCountry}
                          onChange={(e) => handleInputChange('transmittingCountry', e.target.value.toUpperCase())}
                          placeholder="e.g., NL"
                          maxLength={2}
                        />
                        {errors.transmittingCountry && <p className="text-xs text-red-500 mt-1">{errors.transmittingCountry}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Receiving Country *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.receivingCountry ? 'border-red-500' : ''}`}
                          value={formData.receivingCountry}
                          onChange={(e) => handleInputChange('receivingCountry', e.target.value.toUpperCase())}
                          placeholder="e.g., DE"
                          maxLength={2}
                        />
                        {errors.receivingCountry && <p className="text-xs text-red-500 mt-1">{errors.receivingCountry}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* File Size */}
                <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                  <button
                    onClick={() => toggleSection('fileSize')}
                    className={`w-full px-6 py-4 flex items-center justify-between ${theme.cardHover} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-primary-600" />
                      <span className={`font-semibold ${theme.text}`}>File Size Configuration</span>
                    </div>
                    {expandedSections.fileSize ? <ChevronUp className={theme.textMuted} /> : <ChevronDown className={theme.textMuted} />}
                  </button>
                  
                  {expandedSections.fileSize && (
                    <div className="px-6 pb-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Number of Reporting FIs *</label>
                          <input
                            type="number"
                            min="1"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.numReportingFIs ? 'border-red-500' : ''}`}
                            value={formData.numReportingFIs}
                            onChange={(e) => handleNumFIsChange(e.target.value)}
                            placeholder="e.g., 1"
                          />
                          {errors.numReportingFIs && <p className="text-xs text-red-500 mt-1">{errors.numReportingFIs}</p>}
                        </div>
                      </div>
                      
                      {formData.reportingFITINs.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          {formData.reportingFITINs.map((tin, index) => (
                            <div key={index}>
                              <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>FI {index + 1} TIN *</label>
                              <input
                                type="text"
                                className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors[`tin_${index}`] ? 'border-red-500' : ''}`}
                                value={tin}
                                onChange={(e) => handleTINChange(index, e.target.value)}
                                placeholder={`TIN for FI ${index + 1}`}
                              />
                              {errors[`tin_${index}`] && <p className="text-xs text-red-500 mt-1">{errors[`tin_${index}`]}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Individual Accounts</label>
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                            value={formData.individualAccounts}
                            onChange={(e) => handleInputChange('individualAccounts', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Organisation Accounts</label>
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                            value={formData.organisationAccounts}
                            onChange={(e) => handleInputChange('organisationAccounts', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Controlling Persons per Organisation</label>
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                            value={formData.controllingPersons}
                            onChange={(e) => handleInputChange('controllingPersons', e.target.value)}
                            placeholder="1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Actions */}
                <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="w-5 h-5 text-green-600" />
                      <span className={`font-medium ${theme.text}`}>CSV Preview</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGeneratePreview}
                        disabled={isLoadingPreview}
                        className={`px-4 py-2 ${theme.buttonSuccess} font-medium rounded-lg transition-colors flex items-center gap-2 text-sm`}
                      >
                        {isLoadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Preview
                      </button>
                      <button
                        onClick={handleDownloadCsv}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${theme.buttonSecondary}`}
                      >
                        <Download className="w-4 h-4" />
                        Download CSV
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Output Section */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-primary-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Save className={`w-6 h-6 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className={`flex-1 px-4 py-3 rounded-lg border ${theme.input} ${errors.outputPath ? 'border-red-500' : ''}`}
                  placeholder="Select output location..."
                  value={formData.outputPath}
                  readOnly
                />
                <button
                  onClick={handleSelectOutputFile}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
              {errors.outputPath && <p className="text-sm text-red-500 mb-4">{errors.outputPath}</p>}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full px-6 py-4 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating... {generationProgress}</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    <span>Generate CRS XML File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Corrections Page */}
        {currentPage === 'corrections' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Info Banner */}
            <div className={`${darkMode ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-medium ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                    {activeModule === 'fatca' ? 'Generate FATCA Correction Files' : 'Generate CRS702 Correction Files'}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-700'} mt-1`}>
                    {activeModule === 'fatca'
                      ? 'Upload a valid FATCA XML file to generate corrections (FATCA2) or voids (FATCA3).'
                      : correctionDataMode === 'xml' 
                        ? 'Upload a valid CRS701 (new) XML file to generate corrections (OECD2) or deletions (OECD3).'
                        : 'Upload a CSV file with DocRefId column to specify exactly which accounts to correct or delete.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Data Mode Toggle */}
            <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCorrectionDataMode('xml')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    correctionDataMode === 'xml'
                      ? 'bg-orange-600 text-white shadow-lg'
                      : `${theme.text} ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  From XML File
                </button>
                <button
                  onClick={() => setCorrectionDataMode('csv')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    correctionDataMode === 'csv'
                      ? 'bg-orange-600 text-white shadow-lg'
                      : `${theme.text} ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`
                  }`}
                >
                  <Table className="w-5 h-5" />
                  From CSV File
                </button>
              </div>
            </div>

            {/* Upload XML Section - Only show in XML mode */}
            {correctionDataMode === 'xml' && (
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-orange-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Upload className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Source XML File</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border ${theme.input} ${
                        xmlValidation?.is_valid === false ? 'border-red-500' : 
                        xmlValidation?.can_generate_correction ? 'border-green-500' : ''
                      }`}
                      placeholder="Select CRS XML file (CRS701)..."
                      value={correctionXmlPath}
                      readOnly
                    />
                    {correctionXmlPath && (
                      <button
                        onClick={handleClearXmlFile}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSelectXmlFile}
                    disabled={isValidatingXml}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isValidatingXml ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                    {isValidatingXml ? 'Validating...' : 'Browse'}
                  </button>
                </div>

                {/* Validation Result */}
                {xmlValidation && (
                  <div className={`rounded-lg p-4 ${
                    xmlValidation.is_valid && xmlValidation.can_generate_correction
                      ? theme.badgeSuccess
                      : theme.badgeError
                  } border`}>
                    <div className="flex items-center gap-2 mb-3">
                      {xmlValidation.can_generate_correction ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-medium ${
                        xmlValidation.can_generate_correction 
                          ? darkMode ? 'text-green-400' : 'text-green-700'
                          : darkMode ? 'text-red-400' : 'text-red-700'
                      }`}>
                        {xmlValidation.can_generate_correction ? 'Valid CRS701 File' : 'Validation Failed'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${theme.textMuted}`}>
                        v{xmlValidation.version}
                      </span>
                    </div>
                    
                    {xmlValidation.can_generate_correction && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className={theme.textMuted}>Accounts:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.total_accounts}</strong>
                        </div>
                        <div>
                          <span className={theme.textMuted}>Individual:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.individual_accounts}</strong>
                        </div>
                        <div>
                          <span className={theme.textMuted}>Organisation:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.organisation_accounts}</strong>
                        </div>
                        <div>
                          <span className={theme.textMuted}>FIs:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.reporting_fi_count}</strong>
                        </div>
                      </div>
                    )}
                    
                    {xmlValidation.errors?.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowXmlErrorsModal(true)}
                          className="text-sm text-red-500 hover:text-red-600 underline"
                        >
                          View {xmlValidation.errors.length} error{xmlValidation.errors.length > 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                    
                    {xmlValidation.warnings?.length > 0 && (
                      <div className="mt-2 text-xs text-yellow-600">
                        {xmlValidation.warnings.length} warning{xmlValidation.warnings.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* CSV Correction Section - Only show in CSV mode */}
            {correctionDataMode === 'csv' && (
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-orange-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Table className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Correction CSV File</h2>
              </div>
              
              <div className="space-y-4">
                {/* CSV Format Info */}
                <div className={`${theme.accentLight} border rounded-lg p-4`}>
                  <p className={`font-medium ${theme.accentText} mb-2`}>Required CSV Format</p>
                  <p className={`text-sm ${theme.textMuted} mb-3`}>
                    Your CSV must include a <strong>DocRefId</strong> column with valid document reference IDs from your original CRS701 file.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCorrectionCsvPreview(true)}
                      className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View CSV Template
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await window.electronAPI.downloadCorrectionCsvTemplate()
                        } catch (err) {
                          console.error('Download error:', err)
                        }
                      }}
                      className={`text-sm px-3 py-1.5 ${theme.buttonSuccess} rounded-lg flex items-center gap-1`}
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>

                {/* CSV File Upload */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border ${theme.input}`}
                      placeholder="Select correction CSV file..."
                      value={correctionCsvPath}
                      readOnly
                    />
                    {correctionCsvPath && (
                      <button
                        onClick={() => {
                          setCorrectionCsvPath('')
                          setCorrectionCsvPreview(null)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.electronAPI.selectCorrectionCsv()
                        if (result.path) {
                          setCorrectionCsvPath(result.path)
                          setCorrectionCsvPreview(result.preview)
                        }
                      } catch (err) {
                        console.error('CSV select error:', err)
                      }
                    }}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>

                {/* CSV Preview */}
                {correctionCsvPreview && (
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4 overflow-x-auto`}>
                    <p className={`text-sm font-medium ${theme.text} mb-2`}>Preview ({correctionCsvPreview.rowCount} rows)</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          {correctionCsvPreview.headers?.map((h, i) => (
                            <th key={i} className={`px-3 py-2 text-left font-medium ${theme.text}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correctionCsvPreview.rows?.slice(0, 5).map((row, i) => (
                          <tr key={i} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`}>
                            {row.map((cell, j) => (
                              <td key={j} className={`px-3 py-2 ${theme.textMuted}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {correctionCsvPreview.rowCount > 5 && (
                      <p className={`text-xs ${theme.textMuted} mt-2`}>... and {correctionCsvPreview.rowCount - 5} more rows</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Correction Options - Show for both modes when valid */}
            {((correctionDataMode === 'xml' && xmlValidation?.can_generate_correction) || (correctionDataMode === 'csv' && correctionCsvPreview)) && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
                <div className="flex items-center gap-3 mb-4">
                  <RefreshCw className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Correction Options</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Correct FI */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${theme.text}`}>Correct Reporting FI</p>
                      <p className={`text-sm ${theme.textMuted}`}>Modify the Financial Institution data</p>
                    </div>
                    <button
                      onClick={() => setCorrectionOptions(prev => ({ ...prev, correctFI: !prev.correctFI }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${correctionOptions.correctFI ? 'bg-blue-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${correctionOptions.correctFI ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Account Corrections */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Correct Individual */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Correct Individual Accounts (max: {xmlValidation.individual_accounts})
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, correctIndividual: Math.max(0, prev.correctIndividual - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.individual_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.correctIndividual}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctIndividual: Math.min(xmlValidation.individual_accounts - prev.deleteIndividual, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctIndividual: Math.min(xmlValidation.individual_accounts - prev.deleteIndividual, prev.correctIndividual + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Correct Organisation */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Correct Organisation Accounts (max: {xmlValidation.organisation_accounts})
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, correctOrganisation: Math.max(0, prev.correctOrganisation - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.organisation_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.correctOrganisation}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctOrganisation: Math.min(xmlValidation.organisation_accounts - prev.deleteOrganisation, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctOrganisation: Math.min(xmlValidation.organisation_accounts - prev.deleteOrganisation, prev.correctOrganisation + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Individual */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Delete Individual Accounts
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, deleteIndividual: Math.max(0, prev.deleteIndividual - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.individual_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.deleteIndividual}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteIndividual: Math.min(xmlValidation.individual_accounts - prev.correctIndividual, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteIndividual: Math.min(xmlValidation.individual_accounts - prev.correctIndividual, prev.deleteIndividual + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Organisation */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Delete Organisation Accounts
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, deleteOrganisation: Math.max(0, prev.deleteOrganisation - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.organisation_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.deleteOrganisation}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteOrganisation: Math.min(xmlValidation.organisation_accounts - prev.correctOrganisation, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteOrganisation: Math.min(xmlValidation.organisation_accounts - prev.correctOrganisation, prev.deleteOrganisation + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modification Options */}
                  <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-4`}>
                    <p className={`text-sm font-medium ${theme.text} mb-3`}>What to modify in corrections:</p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { key: 'modifyBalance', label: 'Account Balance' },
                        { key: 'modifyAddress', label: 'Address' },
                        { key: 'modifyName', label: 'Name' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={correctionOptions[key]}
                            onChange={(e) => setCorrectionOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${theme.text}`}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Test Mode Toggle */}
                  <div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-lg p-4 border`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${theme.text}`}>Test Mode</p>
                        <p className={`text-sm ${theme.textMuted}`}>
                          {correctionOptions.testMode 
                            ? 'Using OECD11/12/13 (test data indicators)' 
                            : 'Using OECD1/2/3 (production data indicators)'}
                        </p>
                      </div>
                      <button
                        onClick={() => setCorrectionOptions(prev => ({ ...prev, testMode: !prev.testMode }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${correctionOptions.testMode ? 'bg-amber-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${correctionOptions.testMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Output Section */}
            {xmlValidation?.can_generate_correction && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-primary-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <Save className={`w-6 h-6 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className={`flex-1 px-4 py-3 rounded-lg border ${theme.input}`}
                    placeholder="Select output location..."
                    value={correctionOutputPath}
                    readOnly
                  />
                  <button
                    onClick={handleSelectCorrectionOutput}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>

                <button
                  onClick={handleGenerateCorrection}
                  disabled={isGeneratingCorrection || !correctionOutputPath}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                >
                  {isGeneratingCorrection ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating Correction...</span>
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-5 h-5" />
                      <span>Generate CRS702 Correction File</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Page */}
        {currentPage === 'history' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Stats Overview */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'XML Generated', value: globalStats.totalXmlGenerated, icon: FileText, color: 'primary' },
                { label: 'Corrections', value: globalStats.totalCorrectionsGenerated || 0, icon: FileEdit, color: 'orange' },
                { label: 'CSV Uploaded', value: globalStats.totalCsvUploaded, icon: Upload, color: 'green' },
                { label: 'CSV Downloaded', value: globalStats.totalCsvDownloaded, icon: Download, color: 'blue' },
                { label: 'Validation Errors', value: globalStats.totalValidationErrors, icon: AlertCircle, color: 'red' }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs ${theme.textMuted}`}>{label}</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{value}</p>
                    </div>
                    <Icon className={`w-8 h-8 text-${color}-500 opacity-50`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Stats */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Account Statistics</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${theme.text}`}>{(globalStats.totalIndividualAccounts + globalStats.totalOrganisationAccounts).toLocaleString()}</p>
                  <p className={`text-sm ${theme.textMuted}`}>Total Accounts</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold text-blue-500`}>{globalStats.totalIndividualAccounts.toLocaleString()}</p>
                  <p className={`text-sm ${theme.textMuted}`}>Individual</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold text-purple-500`}>{globalStats.totalOrganisationAccounts.toLocaleString()}</p>
                  <p className={`text-sm ${theme.textMuted}`}>Organisation</p>
                </div>
              </div>
              {globalStats.lastGenerated && (
                <p className={`text-xs ${theme.textMuted} mt-4 text-center`}>
                  Last generated: {new Date(globalStats.lastGenerated).toLocaleString()}
                </p>
              )}
            </div>

            {/* File History */}
            <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme.text}`}>File History</h3>
                <div className="flex gap-2">
                  {fileHistory.length > 0 && (
                    <button
                      onClick={() => { if (confirm('Clear all history?')) clearAllHistory() }}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm('Reset all statistics?')) resetAllStats() }}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Reset Stats
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {fileHistory.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {fileHistory.map((entry) => (
                      <div key={entry.id} className={`px-6 py-4 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {entry.type === 'xml' ? (
                              <FileText className="w-5 h-5 text-primary-500" />
                            ) : (
                              <Table className="w-5 h-5 text-green-500" />
                            )}
                            <div>
                              <p className={`font-medium ${theme.text}`}>{entry.fileName}</p>
                              <p className={`text-xs ${theme.textMuted}`}>
                                {entry.accounts} accounts • {new Date(entry.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              entry.mode === 'csv' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                              entry.mode === 'preview' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 
                              'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            }`}>
                              {entry.mode === 'csv' ? 'CSV' : entry.mode === 'preview' ? 'Preview' : 'Random'}
                            </span>
                            <button
                              onClick={() => window.electronAPI.openFileLocation(entry.filePath)}
                              className={`p-2 ${theme.accentText} ${theme.cardHover} rounded-lg transition-colors`}
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteHistoryEntry(entry.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <History className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted} opacity-50`} />
                    <p className={theme.textMuted}>No files generated yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Page */}
        {currentPage === 'settings' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Theme</h3>
              <p className="text-sm text-gray-500 mb-6">Choose your preferred color scheme</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { key: 'light', name: 'Light', icon: '☀️', preview: 'from-blue-500 to-indigo-600', dark: false },
                  { key: 'dark', name: 'Dark', icon: '🌙', preview: 'from-blue-600 to-indigo-800', dark: true },
                  { key: 'midnight', name: 'Midnight', icon: '🌌', preview: 'from-violet-600 to-purple-900', dark: true },
                  { key: 'ocean', name: 'Ocean', icon: '🌊', preview: 'from-cyan-500 to-blue-700', dark: true },
                  { key: 'sunset', name: 'Sunset', icon: '🌅', preview: 'from-orange-400 to-rose-500', dark: false },
                  { key: 'forest', name: 'Forest', icon: '🌲', preview: 'from-emerald-500 to-green-700', dark: true },
                  { key: 'lavender', name: 'Lavender', icon: '💜', preview: 'from-purple-400 to-fuchsia-500', dark: false },
                  { key: 'spaceGalaxy', name: 'Space Galaxy', icon: '🚀', preview: 'from-[#00d9ff] via-[#7b2cbf] to-[#ff006e]', dark: true },
                  { key: 'cyberpunkNeon', name: 'Cyberpunk', icon: '⚡', preview: 'from-[#ff006e] via-[#00f0ff] to-[#b400ff]', dark: true },
                  { key: 'organicForest', name: 'Organic Forest', icon: '🌿', preview: 'from-[#4a7c39] to-[#2d5016]', dark: false },
                  { key: 'oceanUnderwater', name: 'Ocean Depths', icon: '🐠', preview: 'from-[#39cccc] to-[#001f3f]', dark: true },
                  { key: 'steampunkVictorian', name: 'Steampunk', icon: '⚙️', preview: 'from-[#d4af37] via-[#b87333] to-[#8b4513]', dark: false },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedTheme(item.key)}
                    className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
                      selectedTheme === item.key 
                        ? 'ring-2 ring-offset-2 ring-blue-500 border-2 border-blue-500' 
                        : 'border-2 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className={`h-14 bg-gradient-to-br ${item.preview}`} />
                    <div className={`py-2.5 px-2 text-center ${item.dark ? 'bg-gray-800' : 'bg-white'}`}>
                      <span className="mr-1">{item.icon}</span>
                      <span className={`font-medium text-sm ${item.dark ? 'text-white' : 'text-gray-900'}`}>{item.name}</span>
                    </div>
                    {selectedTheme === item.key && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 rounded-full p-0.5">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-6`}>Appearance</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme.text}`}>Animations</p>
                    <p className={`text-sm ${theme.textMuted}`}>Enable smooth transitions and animations</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, animationsEnabled: !prev.animationsEnabled }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.animationsEnabled ? theme.toggleOn : theme.toggleOff}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${settings.animationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-6`}>CSV Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme.text}`}>Auto-validate CSV</p>
                    <p className={`text-sm ${theme.textMuted}`}>Automatically validate CSV files when selected</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, autoValidateCsv: !prev.autoValidateCsv }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.autoValidateCsv ? theme.toggleOn : theme.toggleOff}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${settings.autoValidateCsv ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Partner Jurisdictions Settings */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Partner Jurisdictions</h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>
                Manage which country codes are valid for your CRS reporting. Only selected countries will be used when generating test data.
              </p>
              
              {/* Search and Add */}
              <div className="relative mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textMuted}`} />
                    <input
                      type="text"
                      value={jurisdictionSearch}
                      onChange={(e) => {
                        setJurisdictionSearch(e.target.value)
                        setShowJurisdictionDropdown(true)
                      }}
                      onFocus={() => setShowJurisdictionDropdown(true)}
                      placeholder="Search countries by name or code..."
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme.input} ${theme.text}`}
                    />
                  </div>
                </div>
                
                {/* Dropdown */}
                {showJurisdictionDropdown && jurisdictionSearch && (
                  <div className={`absolute z-10 w-full mt-1 ${theme.card} border rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
                    {searchCountries(jurisdictionSearch)
                      .filter(c => !settings.partnerJurisdictions?.includes(c.code))
                      .slice(0, 10)
                      .map(country => (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              partnerJurisdictions: [...(prev.partnerJurisdictions || []), country.code].sort()
                            }))
                            setJurisdictionSearch('')
                            setShowJurisdictionDropdown(false)
                          }}
                          className={`w-full px-4 py-2 text-left ${theme.cardHover} flex items-center justify-between ${theme.text}`}
                        >
                          <span>{country.name}</span>
                          <span className={`text-sm font-mono ${theme.textMuted}`}>{country.code}</span>
                        </button>
                      ))}
                    {searchCountries(jurisdictionSearch).filter(c => !settings.partnerJurisdictions?.includes(c.code)).length === 0 && (
                      <div className={`px-4 py-2 ${theme.textMuted}`}>No countries found or all matching countries already added</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Jurisdictions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${theme.text}`}>
                    Selected Countries ({settings.partnerJurisdictions?.length || 0})
                  </span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, partnerJurisdictions: DEFAULT_PARTNER_JURISDICTIONS }))}
                    className={`text-sm ${theme.accentText} hover:opacity-80`}
                  >
                    Reset to Default
                  </button>
                </div>
                <div className={`flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg ${theme.card}`}>
                  {(settings.partnerJurisdictions || []).sort().map(code => (
                    <span
                      key={code}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${theme.badge}`}
                    >
                      <span className="font-medium">{getCountryName(code)}</span>
                      <span className="text-xs font-mono opacity-60">{code}</span>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          partnerJurisdictions: prev.partnerJurisdictions.filter(c => c !== code)
                        }))}
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(!settings.partnerJurisdictions || settings.partnerJurisdictions.length === 0) && (
                    <span className={`${theme.textMuted} text-sm`}>No countries selected</span>
                  )}
                </div>
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-6`}>About</h3>
              <div className={`text-sm ${theme.textMuted} space-y-2`}>
                <p><strong>CRS Test Data Generator</strong></p>
                <p>Version 1.0.0</p>
                <p>Generate compliant CRS XML test files for development and testing.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className={`p-6 ${modalType === 'success' ? theme.buttonSuccess : theme.buttonDanger}`}>
              <div className="flex items-center gap-3">
                {modalType === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                <h3 className="text-xl font-bold">{modalType === 'success' ? 'Success' : 'Error'}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className={`${theme.text} whitespace-pre-line`}>{modalMessage}</p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  modalType === 'success' ? theme.buttonSuccess : theme.buttonDanger
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XML Validation Errors Modal */}
      {showXmlErrorsModal && xmlValidation?.errors?.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className={`p-6 ${theme.buttonDanger} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">XML Validation Errors</h3>
                  <p className="text-red-100 text-sm">{xmlValidation.errors.length} error{xmlValidation.errors.length > 1 ? 's' : ''} found</p>
                </div>
              </div>
              <button onClick={() => setShowXmlErrorsModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-2">
              {xmlValidation.errors.map((error, i) => (
                <div key={i} className={`${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3 text-sm ${theme.text}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowXmlErrorsModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Validation Error Modal */}
      {showValidationModal && validationErrors.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className="p-6 bg-red-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">Validation Errors</h3>
                  <p className="text-red-100 text-sm">{validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} found</p>
                </div>
              </div>
              <button onClick={() => setShowValidationModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-2">
              {validationErrors.map((error, i) => (
                <div key={i} className={`${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3 text-sm ${theme.text}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showPreviewModal && csvPreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className="p-6 bg-green-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Table className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">CSV Preview</h3>
                  <p className="text-green-100 text-sm">{csvPreviewData.preview_rows?.length || 0} of {csvPreviewData.total_rows || 0} rows</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {csvPreviewData.preview_rows?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        {csvPreviewData.columns?.slice(0, 12).map((col, i) => (
                          <th key={i} className={`border ${darkMode ? 'border-gray-600' : 'border-gray-300'} px-2 py-1 text-left font-semibold ${theme.text} whitespace-nowrap`}>
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.preview_rows.map((row, i) => (
                        <tr key={i} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          {csvPreviewData.columns?.slice(0, 12).map((col, j) => (
                            <td key={j} className={`border ${darkMode ? 'border-gray-600' : 'border-gray-300'} px-2 py-1 ${theme.text} whitespace-nowrap`}>
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={theme.textMuted}>No data to preview</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleDownloadCsv}
                className={`px-6 py-3 ${theme.buttonSuccess} font-semibold rounded-lg flex items-center gap-2`}
              >
                <Download className="w-5 h-5" />
                Download Full CSV
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className={`flex-1 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRS701 CSV Template Preview Modal */}
      {showCrs701CsvPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className={`p-6 ${theme.buttonSuccess} rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table className="w-8 h-8" />
                  <h3 className="text-xl font-bold">CRS 701 CSV Template</h3>
                </div>
                <button onClick={() => setShowCrs701CsvPreview(false)} className="hover:opacity-80 p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className={`${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mb-4`}>
                <p className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-800'} mb-2`}>CRS 701 - New Account Report</p>
                <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  Use this template to create CSV files for generating CRS 701 (new account) XML reports. 
                  Each row represents one account holder. You can have multiple accounts per Reporting FI.
                </p>
              </div>
              
              <h4 className={`font-medium ${theme.text} mb-2`}>Required Columns</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Column</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Description</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>SendingCompanyIN</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Your company TIN/identifier</td><td className={`px-3 py-2 border ${theme.textMuted}`}>NL123456789</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>TransmittingCountry</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>2-letter country code of sender</td><td className={`px-3 py-2 border ${theme.textMuted}`}>NL</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>ReceivingCountry</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>2-letter country code of receiver</td><td className={`px-3 py-2 border ${theme.textMuted}`}>DE</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>TaxYear</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Reporting tax year</td><td className={`px-3 py-2 border ${theme.textMuted}`}>2024</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>ReportingFI_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Reporting Financial Institution details</td><td className={`px-3 py-2 border ${theme.textMuted}`}>TIN, Name, Address</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountNumber</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Account identifier</td><td className={`px-3 py-2 border ${theme.textMuted}`}>ACC123456</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountBalance</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Account balance amount</td><td className={`px-3 py-2 border ${theme.textMuted}`}>50000.00</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountCurrency</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>3-letter currency code</td><td className={`px-3 py-2 border ${theme.textMuted}`}>EUR</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Individual_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Individual account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>FirstName, LastName, BirthDate, TIN, Address</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Organisation_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Organisation account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>Name, TIN, Address</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>ControllingPerson_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Required for Organisation accounts</td><td className={`px-3 py-2 border ${theme.textMuted}`}>FirstName, LastName, BirthDate</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Payment_Type</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>CRS501, CRS502, CRS503, or CRS504</td><td className={`px-3 py-2 border ${theme.textMuted}`}>CRS501</td></tr>
                  </tbody>
                </table>
              </div>

              <div className={`${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-4`}>
                <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'} mb-2`}>Individual vs Organisation</p>
                <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  Each row must have either <strong>Individual_*</strong> fields OR <strong>Organisation_*</strong> fields filled in, not both.
                  Organisation accounts require a Controlling Person.
                </p>
              </div>

              <h4 className={`font-medium ${theme.text} mb-2`}>Example Rows</h4>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4 overflow-x-auto font-mono text-xs`}>
                <pre className={theme.textMuted}>{`SendingCompanyIN,TransmittingCountry,ReceivingCountry,TaxYear,ReportingFI_TIN,ReportingFI_Name,...
"NL123456789","NL","DE","2024","FI001","Bank ABC","Main St","10","Amsterdam","1012AB","NL",...
"NL123456789","NL","DE","2024","FI001","Bank ABC","Main St","10","Amsterdam","1012AB","NL",...`}</pre>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={async () => {
                  await handleDownloadTemplate()
                  setShowCrs701CsvPreview(false)
                }}
                className={`px-6 py-3 ${theme.buttonSuccess} font-semibold rounded-lg flex items-center gap-2`}
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
              <button
                onClick={() => setShowCrs701CsvPreview(false)}
                className={`flex-1 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction CSV Template Preview Modal */}
      {showCorrectionCsvPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className="p-6 bg-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Correction CSV Template</h3>
                </div>
                <button onClick={() => setShowCorrectionCsvPreview(false)} className="hover:bg-orange-700 p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 mb-4`}>
                <p className={`font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'} mb-2`}>Important: DocRefId Column</p>
                <p className={`text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  The <strong>DocRefId</strong> column must contain valid document reference IDs from your original CRS701 file. 
                  These IDs are used to identify which accounts to correct or delete.
                </p>
              </div>
              
              <h4 className={`font-medium ${theme.text} mb-2`}>Required Columns</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Column</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Description</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>DocRefId</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Original document reference ID to correct/delete</td><td className={`px-3 py-2 border text-green-500`}>Yes</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Action</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>"correct" or "delete"</td><td className={`px-3 py-2 border text-green-500`}>Yes</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountNumber</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>New account number (for corrections)</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountBalance</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>New balance amount</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountCurrency</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Currency code (EUR, USD, etc.)</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Individual_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Individual account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For individual corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Organisation_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Organisation account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For organisation corrections</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className={`font-medium ${theme.text} mb-2`}>Example Rows</h4>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4 overflow-x-auto font-mono text-xs`}>
                <pre className={theme.textMuted}>{`DocRefId,Action,AccountBalance,AccountCurrency
"NL2024FI001_ACC001","correct","75000.00","EUR"
"NL2024FI001_ACC002","delete","","" 
"NL2024FI001_ACC003","correct","120000.00","USD"`}</pre>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={async () => {
                  await window.electronAPI.downloadCorrectionCsvTemplate()
                  setShowCorrectionCsvPreview(false)
                }}
                className={`px-6 py-3 ${theme.buttonSuccess} font-semibold rounded-lg flex items-center gap-2`}
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
              <button
                onClick={() => setShowCorrectionCsvPreview(false)}
                className={`flex-1 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
