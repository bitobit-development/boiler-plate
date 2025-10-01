import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Subscriber } from '@/lib/db/models/Subscriber';

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();

    // Parse request body
    const body = await req.json();
    const {
      name,
      surname,
      email,
      mobile,
      ageVerified,
      source,
      country,
      campaign,
      consentMarketing
    } = body;

    // Validate required fields
    if (!name || !surname || !email || !mobile || ageVerified === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await Subscriber.findByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if mobile already exists
    const existingMobile = await Subscriber.countDocuments({ mobile });
    if (existingMobile > 0) {
      return NextResponse.json(
        { error: 'Mobile number already registered' },
        { status: 409 }
      );
    }

    // Create new subscriber
    const newSubscriber = await Subscriber.create({
      name,
      surname,
      email,
      mobile,
      ageVerified,
      emailVerified: false,
      mobileVerified: false,
      status: 'pending',
      source: source || 'website',
      country: country || undefined,
      campaign: campaign || undefined,
      registrationIp: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      consentMarketing: consentMarketing !== undefined ? consentMarketing : false,
      consentDataProcessing: true,
      consentTerms: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      subscriber: {
        id: newSubscriber.id,
        name: newSubscriber.name,
        surname: newSubscriber.surname,
        email: newSubscriber.email,
        status: newSubscriber.status
      }
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      {
        error: 'An error occurred during registration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}