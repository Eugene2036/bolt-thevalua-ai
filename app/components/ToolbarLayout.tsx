import type { ToolbarProps } from './Toolbar';

import { Spacer } from '@chakra-ui/react';

import { CenteredView } from '~/components/CenteredView';
import { Footer } from '~/components/Footer';

import { Toolbar } from './Toolbar';

type Props = ToolbarProps & {
  children: React.ReactNode;
};

export function ToolbarLayout(props: Props) {
  const { children, ...restOfProps } = props;

  return (
    <div className="flex min-h-screen grow flex-col items-stretch">
      <Toolbar {...restOfProps} />
      <main className="flex flex-col items-stretch py-8">
        <CenteredView className="grow p-4">{children}</CenteredView>
      </main>
      <Spacer />
      <Footer />
    </div>
  );
}
