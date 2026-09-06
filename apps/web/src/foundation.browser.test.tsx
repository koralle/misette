import { Check } from 'lucide-react';
import { Button } from 'react-aria-components';
import { css } from 'styled-system/css';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

test('react aria button and lucide icon render', async () => {
  const screen = await render(
    <Button className={css({ color: 'fg' })}>
      <Check />
      Save
    </Button>,
  );

  await expect.element(screen.getByRole('button', { name: 'Save' })).toBeVisible();
});
