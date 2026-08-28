import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MDES_ERROR_CATALOG,
  searchMdesErrors,
} from '../src/data/mdesErrorCatalog.mjs'

test('catalog has unique codes and complete recovery guidance', () => {
  const codes = MDES_ERROR_CATALOG.map(item => item.code)
  assert.equal(new Set(codes).size, codes.length)
  for (const item of MDES_ERROR_CATALOG) {
    assert.ok(item.title)
    assert.ok(item.meaning)
    assert.ok(item.causes.length)
    assert.ok(item.actions.length)
    assert.ok(item.retry)
  }
})

test('all CRS file-level codes 50001 through 50013 are documented', () => {
  const codes = new Set(MDES_ERROR_CATALOG.map(item => item.code))
  for (let code = 50001; code <= 50013; code += 1) {
    assert.ok(codes.has(String(code)), `missing ${code}`)
  }
})

test('50008 explains the authority prefix and regeneration requirement', () => {
  const [result] = searchMdesErrors('50008')
  assert.equal(result.code, '50008')
  assert.match(result.meaning, /transmitting country \+ reporting year \+ receiving country/i)
  assert.match(result.retry, /changing only the ZIP cannot fix/i)
})

test('search finds target mismatch and certificate guidance', () => {
  assert.equal(searchMdesErrors('properties database different countries')[0].code, 'TARGET-COUNTRY')
  assert.ok(searchMdesErrors('signature').some(item => item.code === '50004'))
})
