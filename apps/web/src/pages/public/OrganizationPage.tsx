import { usePublicOrganization } from '@newreplica/shared/queries';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { OpportunityCard, OrgMark } from '../../components/recruitment';
import { EmptyState, FormError } from '../../components/ui';

export function OrganizationPage() {
  const { slug } = useParams();
  const page = usePublicOrganization(slug);

  useEffect(() => {
    if (page.data) document.title = `${page.data.organization.name} · DexServe`;
  }, [page.data]);

  if (page.isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-16 sm:px-6">
        <div className="skeleton h-24" />
        <div className="skeleton h-64" />
      </div>
    );
  }
  if (page.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-24 text-center sm:px-6">
        <FormError error={page.error} />
        <Link to="/discover" className="btn-secondary">
          Browse all opportunities
        </Link>
      </div>
    );
  }

  const { organization: org, opportunities } = page.data;
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-white">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: org.brandColor }} />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 animate-drift rounded-full opacity-15 blur-3xl"
          style={{ backgroundColor: org.brandColor }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
          <div className="animate-pop-in">
            <OrgMark org={org} size={72} />
          </div>
          <div className="animate-fade-up">
            <h1 className="display text-4xl sm:text-5xl">{org.name}</h1>
            {org.description && <p className="mt-3 max-w-2xl text-lg leading-relaxed">{org.description}</p>}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {org.website && (
                <a href={org.website} target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: org.brandColor }}>
                  Website
                </a>
              )}
              {org.contactEmail && (
                <a href={`mailto:${org.contactEmail}`} className="font-semibold hover:underline" style={{ color: org.brandColor }}>
                  {org.contactEmail}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Open roles</h2>
        {opportunities.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No open roles right now" body={`${org.name} isn’t recruiting at the moment. Check back soon.`} />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {opportunities.map((opp, i) => (
              <div key={opp.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <OpportunityCard opp={opp} showOrg={false} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
