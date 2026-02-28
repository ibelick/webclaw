import { expect, test } from '@playwright/test'

test('table block edit/import/insert and persistence', async ({ page }) => {
  await page.goto('/dev/table-block')
  await page.evaluate(() => {
    window.localStorage.removeItem('chat-table-workbench-blocks-v1')
  })
  await page.reload()

  await page.getByRole('button', { name: 'Add Table Block' }).click()

  await page.getByRole('button', { name: 'Empty' }).first().click()
  const editor = page.locator('table input').first()
  await editor.fill('alpha')
  await editor.press('Enter')

  await expect(page.getByRole('button', { name: 'alpha' })).toBeVisible()

  await page.getByRole('button', { name: 'Import CSV' }).click()
  await page.locator('textarea').first().fill('name,age\nAlice,30\nBob,29')
  await page.getByRole('button', { name: 'Apply import' }).click()

  await expect(
    page.getByRole('button', { name: 'name', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Alice', exact: true }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Insert to Prompt' }).click()

  await expect(page.getByTestId('prompt-target')).toContainText('| name | age |')

  await page.reload()

  await expect(
    page.getByRole('button', { name: 'name', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Alice', exact: true }),
  ).toBeVisible()
})
