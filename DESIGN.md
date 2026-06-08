# EncryptedChat UI Design

## Product Positioning

EncryptedChat is a privacy-first web chat product for direct and group conversations. The interface should feel production-ready, calm, dense, and trustworthy: a secure workspace rather than a social feed.

## Design Style

- 70% Linear: restrained contrast, clear hierarchy, precise spacing, quiet borders, compact controls.
- 20% Telegram Desktop: familiar three-column chat ergonomics, fast conversation scanning, fixed composer.
- 10% Discord: subtle online/unread feedback, responsive hover states, approachable interaction details.

## Light Theme Colors

- Base background: near-white cool gray.
- Container background: white with subtle blue-gray tint.
- Elevated background: white, slightly stronger shadow.
- Primary: saturated professional blue.
- Text: cool near-black.
- Secondary text: muted slate.
- Border: soft blue-gray.
- Success/online: emerald.
- Warning/encryption notice: amber.

## Dark Theme Colors

- Base background: deep neutral navy, never pure black.
- Container background: layered charcoal navy.
- Elevated background: slightly lighter than container.
- Primary: vivid but not neon blue.
- Text: soft off-white, never pure white.
- Secondary text: muted blue-gray.
- Border: low-contrast slate.
- Success/online: emerald with reduced glare.
- Warning/encryption notice: muted amber.

## Typography

- Font family: Inter first, then system UI fallbacks.
- Body size: 14px.
- Dense metadata: 12px.
- Section title: 18px to 22px depending on surface.
- Chat header title: 16px to 18px, semibold.
- Line height: 1.5 for UI text, 1.6 for message bodies.

## Spacing

- Base unit: 4px.
- Tight control gaps: 4px to 8px.
- Conversation item padding: 10px to 12px.
- Surface padding: 16px to 20px.
- Chat message vertical gap: 8px to 12px.
- Composer internal padding: 10px to 12px.

## Radius

- Global radius: 8px.
- Small controls and chips: 6px.
- Message bubbles: 14px with directional corner tightening.
- Avatars: circular.
- Large panels: 0px to 8px depending on whether they are app columns or cards.

## Shadows

- Page columns use borders more than shadows.
- Elevated menus, modals, drawers: soft multi-stop shadow.
- Message images may use a light edge shadow for preview depth.
- Avoid heavy floating-card shadows in the main app shell.

## Motion

- Hover: 150ms.
- Click/press: 120ms.
- Dropdown: 150ms.
- Message appearance: 160ms.
- Conversation switch: 180ms.
- Modal: 200ms.
- Drawer: 250ms.
- Motion should be subtle and should not fight message scrolling.

## Ant Design Token Rules

- Configure theme through `ConfigProvider` with `theme.defaultAlgorithm` and `theme.darkAlgorithm`.
- Define global tokens for `colorPrimary`, `colorBgBase`, `colorBgContainer`, `colorBgElevated`, `colorText`, `colorTextSecondary`, `colorBorder`, `borderRadius`, `boxShadow`, `controlHeight`, and `fontSize`.
- Use component tokens for Layout, Menu, Button, Input, Modal, Drawer, Tabs, and Badge when the default visual density clashes with the chat shell.
- Prefer CSS variables derived from the same theme palette for custom app chrome.
- Avoid one-off hardcoded colors inside pages.

## Chat Layout

- Desktop `>=1200px`: four-zone layout: 72px navigation, 312px conversation list, flexible chat, optional 320px profile panel.
- Tablet `768px-1199px`: hide the right profile column and expose it through a Drawer.
- Mobile `<768px`: show either conversation list or chat content. Chat routes hide the conversation list and expose a back button.
- App height is fixed to `100vh`.
- Message list is the only vertical scroller in chat routes.
- Composer is fixed to the bottom of the chat column.

## Conversation List

- Include direct chats and groups in a single scannable list.
- Search filters by display name, username, UID, group name, or group code.
- Each item includes avatar/icon, title, secondary metadata, unread badge, and selected state.
- Hover should be visible but quiet.
- Unread state should be clear without overpowering the selected state.

## Message Bubbles

- Own messages align right; peer messages align left.
- Consecutive messages from the same sender can visually reduce repeated emphasis.
- Sender and timestamp are secondary metadata.
- Text wraps naturally and preserves new lines.
- Images use rounded previews with a caption row.
- Encrypted/failed states use subdued system styling.
- Dark mode avoids pure black and high-glare white.

## Composer

- Toolbar sits above the editor with icon buttons for emoji and image.
- Editor uses a compact bordered container and supports multi-line input.
- Send button remains visually primary.
- Disabled state must remain legible.
- Image chips show preview, filename, and remove affordance.

## Modals And Drawers

- Modals are elevated, compact, and token-driven.
- Drawers use the same panel styling as the desktop profile column.
- Group member and request lists remain Ant Design Lists but inherit app density.

## Mobile Adaptation

- Touch targets should be at least 40px high.
- Chat header includes a back button on mobile.
- Composer respects viewport height and avoids layout overflow.
- Horizontal action groups wrap instead of clipping.
- Conversation list and chat window should not render as cramped side-by-side columns below 768px.
