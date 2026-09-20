import { expect, it } from 'vitest'
import { resolveDesktopPolicyEnvironment } from '../scripts/desktop-policy-environment.mjs'
import { validateDesktopPackageEnvironment } from '../scripts/desktop-package-environment.mjs'
import { resolveDesktopPolicyConfig } from '../src/mandatory-update-policy.ts'

const origins = { DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: 'https://harness-test.deepseek.com',
  DSH_DESKTOP_MANDATORY_UPDATE_PROD_ORIGIN: 'https://harness.deepseek.com' }

it.each(['test', 'production'] as const)('selects the %s policy and authentication together', (deployment) => {
  const policy = resolveDesktopPolicyEnvironment({ ...origins, DSH_DESKTOP_AUTO_UPDATE_ENV: deployment })
  const origin = deployment === 'test' ? origins.DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN : origins.DSH_DESKTOP_MANDATORY_UPDATE_PROD_ORIGIN
  expect(policy).toEqual({ origin, allowedPageOrigins: [origin], authentication: deployment === 'test' ? 'feishu-test' : 'anonymous' })
  expect(resolveDesktopPolicyConfig(policy)).toMatchObject(policy ?? {})
})

it('requires only the selected origin, defaults to test, and accepts explicit page restrictions', () => {
  const policy = resolveDesktopPolicyEnvironment({
    DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: origins.DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN,
    DSH_DESKTOP_MANDATORY_UPDATE_CONFIG: JSON.stringify({ allowedPageOrigins: ['https://download.deepseek.com'], intervalMs: 5000 }) })
  expect(policy).toMatchObject({ authentication: 'feishu-test', intervalMs: 5000, allowedPageOrigins: ['https://download.deepseek.com'] })
  expect(() => resolveDesktopPolicyEnvironment({ ...origins, DSH_DESKTOP_AUTO_UPDATE_ENV: 'prod' })).toThrow('production')
})

it.each([undefined, '', 'http://harness-test.deepseek.com', 'https://user:secret@harness-test.deepseek.com',
  'https://harness-test.deepseek.com/api', 'https://harness-test.deepseek.com/?secret=value'])('rejects invalid selected origin %s', (origin) => {
  expect(() => resolveDesktopPolicyEnvironment({ DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: origin })).toThrow('HTTPS origin')
  expect(() => resolveDesktopPolicyEnvironment({ DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: origin })).not.toThrow('secret=value')
})

it.each(['{', 'null', '[]', '{"origin":"https://old.example.com"}', '{"authentication":"anonymous"}',
  '{"allowedPageOrigins":[]}', '{"allowedPageOrigins":["http://example.com"]}'])('rejects invalid or conflicting shared options %s', (options) => {
  expect(() => resolveDesktopPolicyEnvironment({ ...origins, DSH_DESKTOP_MANDATORY_UPDATE_CONFIG: options })).toThrow()
})

it.each([{ unsigned: true }, { prepareOnly: true }, {}])('fails before signing/preparation when policy is absent in %j', (options) => {
  for (const platform of ['win32', 'darwin'] as const) {
    expect(() => { validateDesktopPackageEnvironment({ DSH_DESKTOP_APP_ID: 'com.example.test' }, { platform, arch: 'x64' }, options) })
      .toThrow('DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN')
  }
})

it('ships no policy metadata when the mandatory-update mode is disabled', () => {
  expect(resolveDesktopPolicyEnvironment({
    ...origins,
    DSH_DESKTOP_MANDATORY_UPDATE_MODE: 'disabled',
  })).toBeUndefined()
  // An absent origin is no longer an error once the build carries no policy service.
  expect(resolveDesktopPolicyEnvironment({ DSH_DESKTOP_MANDATORY_UPDATE_MODE: 'disabled' })).toBeUndefined()
  // The application resolves the same absent configuration and never queries a service.
  expect(resolveDesktopPolicyConfig(undefined)).toBeUndefined()
})

it('rejects an unsupported mandatory-update mode', () => {
  expect(() => resolveDesktopPolicyEnvironment({ ...origins, DSH_DESKTOP_MANDATORY_UPDATE_MODE: 'off' }))
    .toThrow(/DSH_DESKTOP_MANDATORY_UPDATE_MODE/u)
})

it('validates an unsigned build that carries neither a policy service nor an updater feed', () => {
  expect(() => validateDesktopPackageEnvironment({
    DSH_DESKTOP_APP_ID: 'com.deepseek.harness',
    DSH_DESKTOP_AUTO_UPDATE_ENV: 'none',
    DSH_DESKTOP_MANDATORY_UPDATE_MODE: 'disabled',
  }, { platform: 'win32', arch: 'x64' }, { unsigned: true })).not.toThrow()
})

it('validates an unsigned build whose self-hosted feed is its only updater configuration', () => {
  const environment = {
    DSH_DESKTOP_APP_ID: 'com.deepseek.harness',
    DSH_DESKTOP_AUTO_UPDATE_ENV: 'selfhosted',
    DSH_DESKTOP_MANDATORY_UPDATE_MODE: 'disabled',
  }
  expect(() => validateDesktopPackageEnvironment(environment, { platform: 'win32', arch: 'x64' }, { unsigned: true }))
    .toThrow(/DSH_DESKTOP_SELFHOSTED_UPDATE_URL/u)
  expect(() => validateDesktopPackageEnvironment({
    ...environment,
    DSH_DESKTOP_SELFHOSTED_UPDATE_URL: 'https://updates.example.com/harness/win-x64',
  }, { platform: 'win32', arch: 'x64' }, { unsigned: true })).not.toThrow()
})
