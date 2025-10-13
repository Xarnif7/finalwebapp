# AutomationWizard Cleanup Plan

## Changes to Make:

### 1. Remove Gradients - Use Clean Colors
- Remove all `bg-gradient-to-*` classes
- Replace with simple white/gray backgrounds
- Use `bg-white border border-gray-200` for cards
- Use solid colors for buttons (bg-blue-600, not gradients)

### 2. Simplify Text
- Remove wordy descriptions
- Keep only essential labels
- Remove emoji icons from UI elements
- Shorten helper text

### 3. Clean Up Headers
- Remove gradient text effects on dialog title
- Use simple `text-xl font-semibold text-gray-900`

### 4. Fix Progress Bar
- Remove fancy gradient rings
- Use simple circles with solid colors
- Gray for incomplete, blue for complete, blue ring for current

### 5. CRM Cards
- Remove gradient backgrounds and colored borders
- Use simple white cards with hover effect
- Remove shadow-lg effects

### 6. Success Message
- Remove gradient green background
- Use simple white card with green checkmark

### 7. Step Headers
- Remove all gradient backgrounds from step headers
- Use simple white background with border-bottom

### 8. Buttons
- Remove gradient hover effects
- Use solid colors: bg-blue-600 hover:bg-blue-700

### 9. Template Toggle Verification
- Check that toggle actually creates/activates sequences
- Ensure it shows in Active Sequences tab

