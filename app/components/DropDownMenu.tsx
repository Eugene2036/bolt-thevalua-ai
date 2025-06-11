import { Menu, Transition } from '@headlessui/react';
import { Form } from '@remix-run/react';
import { Fragment, useMemo } from 'react';
import { DotsVertical } from 'tabler-icons-react';

import { AppLinks } from '~/models/links';

import { ToolbarMenuItem } from './ToolbarMenuItem';
import { useUser } from '~/utils';

interface Props {
  loggedIn: boolean;
  isSuper: boolean;
  isBanker: boolean;
  isSignatory: boolean;
}

export function DropDownMenu(props: Props) {
  const { loggedIn, isSuper, isBanker, isSignatory } = props;
  const currentUser = useUser();

  const menuItems: [string, string][] = useMemo(() => {
    if (!loggedIn) {
      return [[AppLinks.Login, 'Log In']];
    }

    if (isSuper) {
      return [
        [AppLinks.UserProfile(currentUser.id), 'My Dashboard'],
        [AppLinks.Companies, 'Companies'],
        [AppLinks.Users, 'Manage Users'],
        [AppLinks.Dashboard, 'Valuations Dashboard'],
        [AppLinks.UserActivity, 'User Activity'],
        [AppLinks.ImportComparablesLatest, 'Import Comparables'],
        [AppLinks.YearRangeValues, 'Update Year Range Values'],
      ];
    }

    if (isBanker) {
      return [
        [AppLinks.Instructions, 'My Dashboard'],
        [AppLinks.Companies, 'Companies'],
      ];
    }
    if (isSignatory) {
      return [
        [AppLinks.UserProfile(currentUser.id), 'My Dashboard'],
        [AppLinks.Companies, 'Companies'],
        [AppLinks.Users, 'Manage Users'],
        [AppLinks.UserActivity, 'User Activity'],
      ];
    }
    // A normal Valuer user
    return [
      [AppLinks.UserProfile(currentUser.id), 'My Dashboard'],
    ];
  }, [loggedIn, isSuper, isBanker, currentUser.id]);

  const children = useMemo(() => {
    const itemChildren = menuItems.map(([link, caption]) => {
      return function child(active: boolean) {
        const separate = link === AppLinks.ExportPlots;
        return (
          <ToolbarMenuItem
            mode="link"
            active={active}
            to={link}
            target={separate ? '_blank' : undefined}
            rel={separate ? 'noopener noreferrer' : undefined}
          >
            {caption}
          </ToolbarMenuItem>
        );
      };
    });

    if (!loggedIn) {
      return itemChildren;
    }

    return [
      ...itemChildren,
      function child(active: boolean) {
        return (
          <Form action={AppLinks.Logout} method="post">
            <ToolbarMenuItem
              mode="button"
              active={active}
              type="submit"
              className="text-red-600 hover:bg-red-50"
            >
              Log Out
            </ToolbarMenuItem>
          </Form>
        );
      },
    ];
  }, [loggedIn, menuItems]);

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button
            type="button"
            className="flex items-center justify-center rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            aria-label="Menu"
          >
            <DotsVertical data-testid="menu" size={20} />
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-50 mt-2 w-64 origin-top-right divide-y divide-gray-100 rounded-lg bg-white shadow-lg ring-1 ring-gray-200 focus:outline-none"
            style={{ zIndex: 1050 }}>
            <div className="py-1">
              {children.map((child, index) => (
                <Menu.Item key={index}>
                  {({ active }) => (
                    <div className={`px-2 ${active ? 'bg-gray-50' : ''}`}>
                      {child(active)}
                    </div>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}