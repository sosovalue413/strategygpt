import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page hero-workbench">
      <div className="hero-workbench__header">
        <div>
          <p className="eyeline">404</p>
          <h1 className="hero-title">Signal not found.</h1>
        </div>
        <p className="hero-copy">
          That route is not part of the current strategy workbench. Go back to the generator and run a fresh market pass.
        </p>
      </div>
      <Link className="button button--primary" href="/">
        Open generator
      </Link>
    </section>
  );
}
