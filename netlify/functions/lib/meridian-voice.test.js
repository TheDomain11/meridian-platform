// Tests for voiceIssues() in meridian-voice.js. Pure regex checks against fixed
// strings — no network calls, no model API, nothing that needs credentials.
const test = require('node:test')
const assert = require('node:assert/strict')
const { voiceIssues, MERIDIAN_VOICE } = require('./meridian-voice.js')

const THIS_EXAMPLE = `Thank you for the details on the Shenzhen supplier. Before you pay the 30% deposit, a Counterparty Check will confirm whether they are the factory or a trading company, and whether their registration matches the invoice. It costs USD 450 and takes three business days. If you send me their full company name and the proforma invoice, I will confirm the scope today.

Kind regards,
George`

const DISCLOSURE = 'George Skordi is not admitted to practise law in any jurisdiction. Meridian does not provide legal advice. Clients who need legal advice should consult a qualified lawyer in the relevant jurisdiction.'

const PRC_LAWYER_SENTENCE = 'Chinese-law input comes from a PRC-qualified lawyer whom Meridian briefs.'

test('voiceIssues returns nothing for the "This" example in MERIDIAN_VOICE', () => {
  assert.deepEqual(voiceIssues(THIS_EXAMPLE), [])
})

test('voiceIssues returns nothing for the disclosure sentence', () => {
  assert.deepEqual(voiceIssues(DISCLOSURE), [])
})

test('voiceIssues returns nothing for a sentence describing a PRC-qualified lawyer', () => {
  assert.deepEqual(voiceIssues(PRC_LAWYER_SENTENCE), [])
})

test('voiceIssues flags "deep-dive"', () => {
  const issues = voiceIssues('This needed a deep-dive.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /inflated word/)
})

test('voiceIssues flags "law firm" even alongside the legal-advice disclaimer (the fixed bug)', () => {
  const issues = voiceIssues('We are a law firm. Meridian does not provide legal advice.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /legal title/)
})

test('voiceIssues flags a "not just X, it\'s Y" contrast construction', () => {
  const issues = voiceIssues("It's not just a check, it's a safeguard.")
  assert.equal(issues.length, 1)
  assert.match(issues[0], /contrast construction/)
})

test('voiceIssues flags a claimed track record', () => {
  const issues = voiceIssues('In our experience this always works.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /claimed track record/)
})

test('voiceIssues returns nothing for empty or missing text', () => {
  assert.deepEqual(voiceIssues(''), [])
  assert.deepEqual(voiceIssues(undefined), [])
})

test('MERIDIAN_VOICE rule 2 is the new sentence-length rule', () => {
  assert.match(MERIDIAN_VOICE, /Sentence length varies\. Most sentences are 15 to 25 words\./)
})
