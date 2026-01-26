import React, { useState } from 'react'
import { 
  FileText, Users, Building2, RefreshCw, AlertTriangle, 
  Zap, Clock, Star, ChevronRight, Search, X, Check
} from 'lucide-react'

// Pre-built templates for common test scenarios
export const TEMPLATES = {
  crs: [
    {
      id: 'crs-basic-individual',
      name: 'Basic Individual Accounts',
      description: '5 individual accounts with standard data',
      icon: Users,
      color: 'blue',
      popular: true,
      config: {
        individualAccounts: 5,
        organisationAccounts: 0,
        includeCorrections: false,
        reportingYear: new Date().getFullYear() - 1
      }
    },
    {
      id: 'crs-basic-org',
      name: 'Basic Organisation Accounts',
      description: '3 organisation accounts with controlling persons',
      icon: Building2,
      color: 'purple',
      config: {
        individualAccounts: 0,
        organisationAccounts: 3,
        includeCorrections: false,
        reportingYear: new Date().getFullYear() - 1
      }
    },
    {
      id: 'crs-mixed',
      name: 'Mixed Account Types',
      description: '5 individuals + 3 organisations',
      icon: Users,
      color: 'green',
      popular: true,
      config: {
        individualAccounts: 5,
        organisationAccounts: 3,
        includeCorrections: false,
        reportingYear: new Date().getFullYear() - 1
      }
    },
    {
      id: 'crs-correction',
      name: 'Correction File',
      description: 'Generate corrections for existing accounts',
      icon: RefreshCw,
      color: 'amber',
      config: {
        individualAccounts: 3,
        organisationAccounts: 2,
        includeCorrections: true,
        reportingYear: new Date().getFullYear() - 1
      }
    },
    {
      id: 'crs-large',
      name: 'Large Dataset',
      description: '50 individuals + 20 organisations for load testing',
      icon: Zap,
      color: 'red',
      config: {
        individualAccounts: 50,
        organisationAccounts: 20,
        includeCorrections: false,
        reportingYear: new Date().getFullYear() - 1
      }
    },
    {
      id: 'crs-edge-cases',
      name: 'Edge Cases',
      description: 'Accounts with special characters, long names, etc.',
      icon: AlertTriangle,
      color: 'orange',
      config: {
        individualAccounts: 10,
        organisationAccounts: 5,
        includeCorrections: false,
        useEdgeCases: true,
        reportingYear: new Date().getFullYear() - 1
      }
    }
  ],
  fatca: [
    {
      id: 'fatca-basic',
      name: 'Basic FATCA Report',
      description: '5 US reportable accounts',
      icon: Users,
      color: 'blue',
      popular: true,
      config: {
        accounts: 5,
        includeCorrections: false
      }
    },
    {
      id: 'fatca-pooled',
      name: 'Pooled Reporting',
      description: 'Aggregated small accounts',
      icon: Building2,
      color: 'purple',
      config: {
        accounts: 3,
        pooledReporting: true
      }
    },
    {
      id: 'fatca-nil',
      name: 'Nil Report',
      description: 'No reportable accounts',
      icon: FileText,
      color: 'gray',
      config: {
        accounts: 0,
        nilReport: true
      }
    }
  ],
  cbc: [
    {
      id: 'cbc-basic',
      name: 'Basic CBC Report',
      description: 'Standard country-by-country report',
      icon: Building2,
      color: 'blue',
      popular: true,
      config: {
        entities: 5,
        jurisdictions: 3
      }
    },
    {
      id: 'cbc-multinational',
      name: 'Large Multinational',
      description: '20 entities across 10 jurisdictions',
      icon: Zap,
      color: 'green',
      config: {
        entities: 20,
        jurisdictions: 10
      }
    }
  ]
}

// Template Card Component
function TemplateCard({ template, onSelect, selected }) {
  const Icon = template.icon
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <button
      onClick={() => onSelect(template)}
      className={`
        w-full p-4 rounded-xl border text-left transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg
        ${selected 
          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30' 
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[template.color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-200 truncate">{template.name}</h4>
            {template.popular && (
              <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
            )}
            {selected && (
              <Check className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{template.description}</p>
        </div>
      </div>
    </button>
  )
}

// Template Library Modal
export function TemplateLibraryModal({ 
  isOpen, 
  onClose, 
  onSelectTemplate, 
  module = 'crs',
  theme = {}
}) {
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  
  if (!isOpen) return null

  const templates = TEMPLATES[module] || []
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleApply = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`w-full max-w-2xl max-h-[80vh] mx-4 rounded-xl shadow-2xl overflow-hidden ${theme.card || 'bg-gray-900'} border ${theme.border || 'border-gray-700'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-semibold ${theme.text || 'text-gray-200'}`}>Template Library</h2>
            <p className={`text-sm ${theme.textMuted || 'text-gray-400'}`}>Choose a pre-built template to get started quickly</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="p-4 overflow-y-auto max-h-[400px]">
          <div className="grid grid-cols-2 gap-3">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplate?.id === template.id}
                onSelect={setSelectedTemplate}
              />
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No templates found matching "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {selectedTemplate ? `Selected: ${selectedTemplate.name}` : 'Select a template to continue'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedTemplate}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                selectedTemplate 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Apply Template
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick template button for inline use
export function QuickTemplateButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm transition-colors ${className}`}
    >
      <FileText className="w-4 h-4" />
      Use Template
    </button>
  )
}

export default TemplateLibraryModal
