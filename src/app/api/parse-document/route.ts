import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return Response.json({ 
    status: "deprecated", 
    message: "Client-side parsing is now used instead directly in the browser. 💙" 
  });
}
