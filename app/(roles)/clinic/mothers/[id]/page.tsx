// TODO: one mother's record, visits and risk flags. Always query with scopeWhere(session).
export default async function MotherRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1 className="text-2xl font-semibold">Mother {id}</h1>;
}
