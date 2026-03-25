# Feature Template: UI Component

Use this template when adding a new UI component or feature.

---

## Request Format for myway.txt

```
Add [COMPONENT_NAME] to [PAGE/SECTION]
```

**Example:**
```
Add export to Excel button to results page
```

---

## Functional Requirements Template

```markdown
### FR-1: Component Implementation
- Create React component in `src/components/[ComponentName].jsx`
- Follow existing design patterns and theme system
- Use Lucide icons for consistency
- Add data-testid attributes for testing

### FR-2: Multi-Language Support
- Add translations to `src/i18n/translations.js`
- Support EN, NL, ES languages
- Use `t(language, 'key')` helper function

### FR-3: State Management
- Use React hooks (useState, useEffect)
- Persist state to localStorage if needed
- Handle loading and error states

### FR-4: Integration
- Add to parent component
- Wire up event handlers
- Connect to IPC if needed
```

---

## Test Requirements

### E2E Tests Must Cover:
- [ ] Component renders correctly
- [ ] All interactive elements work
- [ ] All 3 languages display correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Accessibility (keyboard navigation)

---

## Acceptance Criteria

- [ ] Component matches design system
- [ ] All tests pass
- [ ] Multi-language support complete
- [ ] No console errors
- [ ] Responsive design works
