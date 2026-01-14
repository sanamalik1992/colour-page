import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { ResultView } from '@/components/result/result-view'

export const runtime = 'nodejs'

type PageProps = {
  params: { id: string }
}

export default async function ResultPage({ params }: PageProps) {
  const jobId = params.id

  const { data: job, error } = await supabaseAdmin
    .from('jobs')
    .select(
      'id,status,complexity,instructions,custom_text,upload_path,preview_url,result_url,is_paid,stripe_payment_id,created_at,updated_at,completed_at'
    )
    .eq('id', jobId)
    .single()

  if (error || !job) {
    notFound()
  }

  let resultSignedUrl: string | null = null

  if (job.is_paid && job.result_url) {
    const { data } = await supabaseAdmin.storage
      .from('results')
      .createSignedUrl(job.result_url, 3600)

    resultSignedUrl = data?.signedUrl || null
  }

  return (
    <ResultView
      job={job}
      resultUrl={resultSignedUrl}
      isPaid={job.is_paid}
    />
  )
}
