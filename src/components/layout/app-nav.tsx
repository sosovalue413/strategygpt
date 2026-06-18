"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, ArrowRight, Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "Generator" },
  { href: "/markets", label: "Markets" },
  { href: "/history", label: "History" },
  { href: "/methodology", label: "Method" }
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav-pill" aria-label="Primary navigation">
      <Link className="nav-pill__brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          SG
        </span>
        <span>StrategyGPT AI</span>
      </Link>
      <button className="nav-pill__menu-button" type="button" aria-expanded={open} aria-controls="primary-nav-links" onClick={() => setOpen((value) => !value)}>
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        <span className="sr-only">Toggle navigation</span>
      </button>
      <ul id="primary-nav-links" className={`nav-pill__links${open ? " is-open" : ""}`}>
        {links.map((link) => (
          <li key={link.href}>
            <Link className="nav-pill__link" href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link className="nav-pill__action" href="/markets">
        <Activity size={16} aria-hidden="true" />
        <span>Live data</span>
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </nav>
  );
}
