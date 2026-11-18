import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('url');

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'O parâmetro "url" é obrigatório.' },
        { status: 400 }
      );
    }

    const dataUrl = await QRCode.toDataURL(text, {
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return NextResponse.json({
      success: true,
      dataUrl,
    });
  } catch (error: unknown) {
    // Let Next.js handle internal prerender interruption
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      (error as { digest?: string }).digest === 'NEXT_PRERENDER_INTERRUPTED'
    ) {
      throw error;
    }

    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar QR Code' },
      { status: 500 }
    );
  }
}
