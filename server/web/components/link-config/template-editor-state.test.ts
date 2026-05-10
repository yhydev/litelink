import test from "node:test"
import assert from "node:assert/strict"
import {
  addTemplateItem,
  extractTemplateVariables,
  getDuplicateTemplateNames,
  moveTemplateItem,
  removeTemplateItem,
  toConnectionTemplatePayload,
  toTemplateItems,
  updateTemplateItem,
} from "./template-editor-state"

test("toTemplateItems returns default when input empty", () => {
  const items = toTemplateItems(undefined)
  assert.equal(items.length, 1)
  assert.equal(items[0].name, "default")
  assert.equal(items[0].template, "")
  assert.match(items[0].id, /^tpl_/) 
})

test("add/update/remove keeps list stable", () => {
  let items = toTemplateItems([{ name: "a", template: "x" }])
  const originalId = items[0].id

  items = addTemplateItem(items)
  assert.equal(items.length, 2)

  const secondId = items[1].id
  items = updateTemplateItem(items, secondId, { name: "b", template: "y" })
  assert.equal(items[1].name, "b")
  assert.equal(items[1].template, "y")
  assert.equal(items[0].id, originalId)

  items = removeTemplateItem(items, secondId)
  assert.equal(items.length, 1)
  assert.equal(items[0].id, originalId)
})

test("remove last item creates default fallback", () => {
  const items = toTemplateItems([{ name: "only", template: "v" }])
  const next = removeTemplateItem(items, items[0].id)
  assert.equal(next.length, 1)
  assert.equal(next[0].name, "default")
})

test("moveTemplateItem swaps by index", () => {
  const items = toTemplateItems([
    { name: "a", template: "1" },
    { name: "b", template: "2" },
    { name: "c", template: "3" },
  ])
  const movedDown = moveTemplateItem(items, 0, 1)
  assert.deepEqual(movedDown.map((i) => i.name), ["b", "a", "c"])

  const movedUp = moveTemplateItem(movedDown, 2, -1)
  assert.deepEqual(movedUp.map((i) => i.name), ["b", "c", "a"])

  const same = moveTemplateItem(movedUp, 0, -1)
  assert.equal(same, movedUp)
})

test("duplicate detection is case-insensitive and trims spaces", () => {
  const items = toTemplateItems([
    { name: " SSH ", template: "a" },
    { name: "ssh", template: "b" },
    { name: "rdp", template: "c" },
  ])
  assert.deepEqual(getDuplicateTemplateNames(items), ["ssh"])
})

test("extractTemplateVariables returns unique variables", () => {
  const vars = extractTemplateVariables("ssh://{{user}}@{{host}}/{{user}}?p={{port}}")
  assert.deepEqual(vars, ["user", "host", "port"])
})

test("toConnectionTemplatePayload strips internal id", () => {
  const items = toTemplateItems([{ name: "ssh", template: "x" }])
  const payload = toConnectionTemplatePayload(items)
  assert.deepEqual(payload, [{ name: "ssh", template: "x" }])
})

test("regression: edit/add/delete/move sequence keeps id-value mapping correct", () => {
  let items = toTemplateItems([
    { name: "a", template: "ta" },
    { name: "b", template: "tb" },
  ])

  const idA = items[0].id
  const idB = items[1].id

  items = updateTemplateItem(items, idA, { template: "ta-1" })
  items = addTemplateItem(items)
  const idC = items[2].id
  items = updateTemplateItem(items, idC, { name: "c", template: "tc" })

  items = moveTemplateItem(items, 2, -1)
  items = removeTemplateItem(items, idB)

  const map = new Map(items.map((item) => [item.id, item]))
  assert.equal(map.get(idA)?.name, "a")
  assert.equal(map.get(idA)?.template, "ta-1")
  assert.equal(map.get(idC)?.name, "c")
  assert.equal(map.get(idC)?.template, "tc")
  assert.equal(map.has(idB), false)
})
