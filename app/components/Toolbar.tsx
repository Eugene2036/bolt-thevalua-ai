import { useNavigation } from '@remix-run/react';

import logo from '~/../public/images/logo_light.png';

import { CenteredView } from './CenteredView';
import { DropDownMenu } from './DropDownMenu';
import { ProgressBar } from './ProgressBar';
import { UserProfile } from './UserProfile';
import { AppLinks } from '~/models/links';

export interface ToolbarProps {
  isSuper: boolean;
  isBanker: boolean;
  isSignatory: boolean;
  currentUserName: string | undefined;
  showProgressBar?: boolean;
}

export function Toolbar(props: ToolbarProps) {
  const { isSuper, isBanker, isSignatory, currentUserName, showProgressBar: initShowProgressBar } = props;

  const navigation = useNavigation();

  const showProgressBar = initShowProgressBar || navigation.state !== 'idle';

  return (
    <header className="sticky top-0 z-50 flex w-full flex-col items-stretch border border-stone-200 bg-white shadow-sm print:hidden"
      style={{ zIndex: 1000 }}>
      {showProgressBar && (
        <div className="absolute inset-0 flex flex-col items-stretch py-0">
          <ProgressBar />
        </div>
      )}
      <div className="flex flex-col items-stretch px-2 py-4">
        <CenteredView>
          <div className="flex flex-row items-center justify-center gap-8 whitespace-nowrap">
            <img src={logo} alt="Valua" className="mx-2 rounded w-48" />
            <div className="grow" />
            <div className="flex flex-row items-end justify-end gap-2 whitespace-nowrap w-full max-w-4xl ">
              <div className="grow" />
              {currentUserName &&
                <UserProfile email={currentUserName} />
              }
              <div className='flex flex-col items-end px-2 py-4 border rounded-lg shadow-md  bg-stone-100 hover:bg-stone-200'>
                <DropDownMenu loggedIn={!!currentUserName} isSuper={isSuper} isBanker={isBanker} isSignatory={isSignatory} />
              </div>
            </div>
          </div>
        </CenteredView>
      </div>
    </header>
  );
}