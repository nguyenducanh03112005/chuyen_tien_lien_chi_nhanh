# Development Environment

## Purpose
Keep all machine-specific configuration in one place.

## Suggested services

Mobile:
- Flutter OR React Native Expo

Backend:
- Node.js
- Express/Fastify

Suggested local ports:
- Coordinator: `3000`
- HN Node: `3001`
- HCM Node: `3002`
- DN Node: `3003`

These are examples. If the actual project uses different ports, update this file and the environment configuration.

## Environment variables

Coordinator:
```env
PORT=3000
HN_NODE_URL=http://localhost:3001
HCM_NODE_URL=http://localhost:3002
DN_NODE_URL=http://localhost:3003
```

Mobile:
```env
API_BASE_URL=http://<COORDINATOR_HOST>:3000
```

## LAN note
When testing from a physical phone, `localhost` means the phone itself, not the development PC.

Use the development machine's LAN IP, for example:
`http://192.168.x.x:3000`

Do not hard-code the LAN IP in application source.

## Startup order
Recommended:
1. Start HN node.
2. Start HCM node.
3. Start DN node.
4. Start Coordinator.
5. Start Mobile App.

## Environment status
Update this document whenever ports, databases, framework, or startup commands change.
