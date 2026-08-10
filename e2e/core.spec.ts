import { expect, test } from '@playwright/test';

test.beforeEach(async ({page})=>{await page.goto('/settings');await page.evaluate(()=>localStorage.removeItem('mise-demo-state-v2'));await page.reload()});

test('confirm, plan, shop, cook, and leave feedback',async({page})=>{
  await page.goto('/kitchen');
  await expect(page.getByRole('heading',{name:/Do you still have/})).toBeVisible();
  await page.getByRole('button',{name:'That’s right'}).click();
  await page.goto('/plan');
  await page.getByRole('button',{name:'Plan',exact:true}).first().click();
  await expect(page.getByText(/Reserved for/)).toBeVisible();
  await page.goto('/groceries');
  const firstCheck=page.getByRole('button',{name:/Check /}).first();
  if(await firstCheck.isVisible())await firstCheck.click();
  await page.goto('/week');
  await page.getByRole('link',{name:'Cook'}).first().click();
  while(await page.getByRole('button',{name:/Next step/}).isVisible())await page.getByRole('button',{name:/Next step/}).click();
  await page.getByRole('button',{name:'Finish meal'}).click();
  await page.getByLabel('Anything to remember?').fill('Excellent sauce and useful leftovers.');
  await page.getByRole('button',{name:/Save feedback/}).click();
  await expect(page.getByText('Excellent sauce and useful leftovers.')).toBeVisible();
});

test('recipe generation requires review before save',async({page})=>{
  await page.goto('/recipes/generate');
  await page.getByRole('button',{name:'Generate draft'}).click();
  await expect(page.getByText(/Review draft/)).toBeVisible();
  await page.getByRole('button',{name:'Accept & save'}).click();
  await expect(page).toHaveURL(/\/recipes$/);
});
