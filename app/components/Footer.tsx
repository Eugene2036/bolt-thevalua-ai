import { AppLinks } from "~/models/links";
import { CenteredView } from "./CenteredView";

export function Footer() {
  return (
    <CenteredView className="p-4 bg-black h-[120px] pb-6">
      <footer className="text-sm text-center font-light text-white">
        Copyright © 2025 ThaValua Ltd
      </footer>
      <div className="text-sm text-center font-light text-white">
        All rights reserved.
      </div>
      <div className="text-xs text-center font-light text-white pt-3">
        <a
          href={AppLinks.PrivacyPolicy}
          // target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-gray-400"
        >
          Privacy Policy
        </a>
        {" | "}
        <a
          href={AppLinks.TermsOfService}
          // target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-gray-400"
        >
          Terms of Service
        </a>
        {" | "}
        <a
          href={AppLinks.FAQ}
          // target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-gray-400"
        >
          FAQ
        </a>
      </div>
    </CenteredView>
  );
}
