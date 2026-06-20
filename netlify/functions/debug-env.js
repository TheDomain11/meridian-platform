exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      keys: Object.keys(process.env).filter(k =>
        k.includes('SUPABASE') || k.includes('RESEND') || k.includes('STRIPE')
      ),
      nodeEnv: process.env.NODE_ENV,
    }),
  }
}
