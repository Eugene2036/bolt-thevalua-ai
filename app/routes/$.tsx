import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { AppLinks } from '~/models/links';

export default function NotFound() {
  return (
    <div className="flex flex-col items-stretch justify-center gap-12 px-4 py-2">
      <div className="flex flex-col items-stretch gap-0">
        <h2 className="text-xl font-semibold">Error 404</h2>
        <div className="text-slate-500">Sorry, we couldn't find this page.</div>
      </div>
      <div className="flex flex-col items-stretch gap-4">
        <span>This could have been because of any of the following:</span>
        <ul className="list-disc">
          <li>The page has moved.</li>
          <li>The page no longer exists.</li>
          <li>We are doing some maintenance, the page will be back soon.</li>
          <li>You entered a slighly wrong URL, try checking for typos.</li>
        </ul>
        <span>Please try again or visit the homepage.</span>
      </div>
      <SecondaryButtonLink to={AppLinks.Home}>HOME PAGE</SecondaryButtonLink>
    </div>
  );
}
