# Mobile Responsive Testing Checklist

## Quick Test Guide
Run through this checklist on different device sizes to verify mobile responsiveness.

### 1. Initial Load & Layout
- [ ] Page loads without horizontal scroll on mobile (375px width)
- [ ] All content is visible without zooming
- [ ] Header displays properly with version info
- [ ] Padding feels appropriate for screen size

### 2. Tab Navigation
- [ ] Tabs are horizontally scrollable on mobile
- [ ] All three tabs visible and tappable
- [ ] Active tab is clearly indicated
- [ ] Smooth scroll behavior
- [ ] No tab text cutoff

### 3. Race/Class Selection
- [ ] Race dropdown works properly
- [ ] Subrace dropdown is accessible
- [ ] Class selector buttons are tappable (44px minimum)
- [ ] Dropdowns don't overflow screen
- [ ] Karakuri youkai options display correctly

### 4. Points Management
- [ ] "Points Remaining" is visible
- [ ] All action buttons are tappable
- [ ] Button labels show appropriately (icons on mobile, text on desktop)
- [ ] Buttons don't overlap or go off-screen

### 5. Stat Rows
- [ ] Each stat row displays all controls
- [ ] + and - buttons are easily tappable
- [ ] Input field accepts touch/keyboard input
- [ ] Stat value is prominent and readable
- [ ] Stat breakdown shows on appropriate screen sizes

### 6. Collapsible Sections

#### Food Section
- [ ] Grid adapts to screen size
- [ ] Food options are tappable
- [ ] No text overflow

#### History & Stamps
- [ ] History dropdown works
- [ ] Stamp inputs are accessible
- [ ] Grid layout appropriate for screen

#### Talents
- [ ] Checkboxes are tappable
- [ ] Input fields for ranks work
- [ ] Special race talents display correctly

#### Advanced Options
- [ ] All input fields accessible
- [ ] Dragon pieces inputs work
- [ ] HP % slider functional
- [ ] Custom stats grid adapts

### 7. Modals & Overlays
- [ ] Stat info modal displays properly
- [ ] Modal content is scrollable
- [ ] Close button is accessible
- [ ] Modal doesn't overflow viewport

### 8. Import/Export
- [ ] Import/Export section displays
- [ ] Text areas are usable
- [ ] Buttons are tappable
- [ ] File picker works

### 9. Different Orientations

#### Portrait Mode (recommended for testing)
- [ ] 375px width (iPhone SE)
- [ ] 414px width (iPhone Pro Max)
- [ ] 768px width (iPad)

#### Landscape Mode
- [ ] 667px width (iPhone SE landscape)
- [ ] 1024px width (iPad landscape)

### 10. Touch Interactions
- [ ] No double-tap zoom on buttons
- [ ] Smooth scrolling
- [ ] Dropdowns respond to touch
- [ ] Number inputs accept keyboard

### 11. Desktop Verification (1280px+)
- [ ] Layout matches original design
- [ ] All features work as before
- [ ] No unexpected layout changes
- [ ] Hover states still work

## Quick Device Test Commands

### Chrome DevTools
1. Press `F12` or `Ctrl+Shift+I`
2. Click device toolbar icon (or `Ctrl+Shift+M`)
3. Select device or enter custom dimensions

### Recommended Test Sizes
```
Mobile Portrait:
- 375 x 667  (iPhone SE)
- 390 x 844  (iPhone 13)
- 414 x 896  (iPhone Pro Max)

Tablet:
- 768 x 1024 (iPad)
- 820 x 1180 (iPad Air)

Desktop:
- 1280 x 720
- 1920 x 1080
```

## Common Issues to Check

### Text Issues
- ❌ Text too small to read
- ❌ Text overlapping
- ❌ Text getting cut off

### Button Issues  
- ❌ Buttons too small to tap
- ❌ Buttons overlapping
- ❌ Buttons going off-screen

### Layout Issues
- ❌ Horizontal scrolling
- ❌ Content overflowing
- ❌ Elements stacking incorrectly

### Input Issues
- ❌ Input fields too small
- ❌ Dropdowns not opening
- ❌ Number spinners hard to use

## Automated Testing (Optional)
If you have testing tools, verify:
- Lighthouse Mobile score > 90
- No horizontal overflow
- All interactive elements ≥ 44x44px
- Font sizes ≥ 12px base

## Sign Off
- [ ] Tested on real mobile device
- [ ] Tested in Chrome DevTools
- [ ] All critical features work
- [ ] No regressions on desktop
- [ ] Ready for production

## Notes
Record any issues found during testing:
```
Issue: 
Device/Size: 
Screenshot/Details: 
Priority: Low/Medium/High
```
