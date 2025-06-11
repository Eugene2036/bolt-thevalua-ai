import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { INSURANCE_ITEMS, InsuranceItem, ROOF_TYPES } from '~/models/insurance';
import { PARKING_TYPES } from '~/models/parkingTypes.validations';
import { GrcFeeType, GrcFeeTypePercs, ValuationType } from '~/models/plots.validations';
import { PROPERTY_TYPES } from '~/models/propertyTypes.validations';
import { StoredValueId } from '~/models/storedValuest';

const prisma = new PrismaClient();

async function seed() {
  await prisma.company.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.propertyType.deleteMany();
  await prisma.insurance.deleteMany();
  await prisma.roofType.deleteMany();
  await prisma.insuranceItem.deleteMany();
  await prisma.outgoing.deleteMany();
  await prisma.parking.deleteMany();
  await prisma.parkingType.deleteMany();
  await prisma.plot.deleteMany();
  await prisma.password.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storedValue.deleteMany();
  console.log('1');

  const hashedPassword = await bcrypt.hash('default@8901', 10);

  const pairs = [
    [StoredValueId.VacancyPercentage, 15],
    [StoredValueId.CapitalisationRate, 20],
    [StoredValueId.NetAnnualEscalation, 7],
    [StoredValueId.DiscountRate, 9],
    [StoredValueId.LastCapitalisedPerc, 10],
    [StoredValueId.InsuranceVat, 10],
    [StoredValueId.PreTenderEscalationAt, 10],
    [StoredValueId.PreTenderEscalationPerc, 10],
    [StoredValueId.PostTenderEscalationAt, 10],
    [StoredValueId.PostTenderEscalationPerc, 10],
  ] as const;
  for (let pair of pairs) {
    await prisma.storedValue.create({
      data: {
        identifier: pair[0],
        value: pair[1],
      },
    });
  }
  console.log('2');

  const company = await prisma.company.create({
    data: {
      FullName: 'John Doe',
      CompanyName: 'Real Assets',
      LocationAddress: 'Plot 1, Block 1, Street 1, City 1',
      PostalAddress: 'P. O. Box AE276, Gaborone, Botswana',
      Phone: '+267 33 4567',
      Mobile: '+267 722 96 761',
      Fax: '+267 393 1111',
      Email: 'info@realassets.co.bw',
      Website: 'www.realassets.co.bw',
      LogoLink: 'https://www.realassets.co.bw/logo.png',
    },
  });
  console.log('3');

  const superadmin = await prisma.userGroup.create({
    data: {
      name: 'Super Admin',
      companyId: company.id,
      allowCompanySettings: true,
      allowCreateNewCompany: true,
      allowCreateNewUser: true,
      allowDeleteCompany: true,
      allowMarkAsReviewed: true,
      allowSetValuerTargets: true,
      allowUnvaluedProperties: true,
      allowUserActivity: true,
      allowUserManagement: true,
      allowValuationsDownload: true,
    },
  });
  console.log('4');
  await prisma.userGroup.create({
    data: {
      name: 'Valuer',
      companyId: company.id,
      allowCompanySettings: false,
      allowCreateNewCompany: false,
      allowCreateNewUser: false,
      allowDeleteCompany: false,
      allowMarkAsReviewed: true,
      allowSetValuerTargets: false,
      allowUnvaluedProperties: true,
      allowUserActivity: true,
      allowUserManagement: false,
      allowValuationsDownload: true,
    },
  });
  console.log('5');

  const eugene = await prisma.user.create({
    data: {
      email: 'info@thevalua.com',
      password: { create: { hash: hashedPassword } },
      isVerified: true,
      isSuper: true,
      userGroupId: superadmin.id,
    },
  });
  console.log('6');
  const maje = await prisma.user.create({
    data: {
      email: 'maje@majemaje.com',
      password: { create: { hash: hashedPassword } },
      isVerified: true,
      isSuper: true,
      userGroupId: superadmin.id,
    },
  });
  console.log('7');
  const tendai = await prisma.user.create({
    data: {
      email: 'tendai@realassets.co.bw',
      password: { create: { hash: hashedPassword } },
      isVerified: true,
      isSuper: true,
      userGroupId: superadmin.id,
    },
  });
  console.log('8');

  const propertyTypeIds: string[] = [];
  for (let identifier of PROPERTY_TYPES) {
    const { id } = await prisma.propertyType.create({
      data: { identifier },
    });
    propertyTypeIds.push(id);
  }
  console.log('9');

  const parkingTypeIds: string[] = [];
  for (let identifier of PARKING_TYPES) {
    const { id } = await prisma.parkingType.create({
      data: { identifier },
    });
    parkingTypeIds.push(id);
  }
  console.log('10');

  const insuranceItemIds: string[] = [];
  for (let identifier of INSURANCE_ITEMS) {
    const { id } = await prisma.insuranceItem.create({
      data: { identifier },
    });
    insuranceItemIds.push(id);
  }
  const shopInsuranceItem = await prisma.insuranceItem.findFirst({
    where: { identifier: InsuranceItem.Shop },
  });
  if (!shopInsuranceItem) {
    throw new Error('Shop insurnce item not found');
  }
  console.log('11');

  const roofTypeIds: string[] = [];
  for (let identifier of ROOF_TYPES) {
    const { id } = await prisma.roofType.create({
      data: { identifier },
    });
    roofTypeIds.push(id);
  }
  console.log('12');

  const outgoingIdentifiers = [
    ['Rates', '1'],
    ['Levies', '12'],
    ['Electricity and Water in Common Areas', '12'],
    ['Maintenance and Repairs', '%'],
    ['Refurbishment', '1'],
    ['Management Fee', '%'],
    ['Auditors Fee', '1'],
    ['Insurance', '%'],
    ['Security Services', '12'],
    ['Cleaning Services', '12'],
    ['Maintenance - Lift', '12'],
    ['Maintenance - A/C', '12'],
  ];

  for (let i = 0; i < 30; i++) {
    await prisma.comparablePlot.create({
      data: {
        plotNumber: faker.number.int(5000).toString(),
        plotExtent: faker.number.float({ precision: 0.001 }),
        propertyType: i % 2 === 0 ? ValuationType.Commercial : ValuationType.Residential,
        location: faker.location.streetAddress(),
        suburb: faker.location.county(),
        price: faker.finance.amount(2_500, 10_000, 2),
        transactionDate: faker.date.past(),
        titleDeed: faker.lorem.word(),
        status: i % 2 === 0 ? 'Rental' : 'For Sale',
      },
    });
  }

  for (let i = 0; i < 20; i++) {
    const plot = await prisma.plot.create({
      data: {
        globalId: '',
        propertyId: i + 1,
        plotNumber: faker.number.int(5000).toString(),
        valuer: faker.person.fullName(),
        inspectionDate: faker.date.recent(),
        plotDesc: faker.lorem.sentence(6),
        plotExtent: faker.number.float({ precision: 0.001 }),
        address: faker.location.streetAddress(),
        council: i % 2 === 0,
        zoning: i % 2 === 0 ? 'Residential' : 'Commercial',
        classification: i % 2 === 0 ? 'Residential' : 'Commercial',
        valuationType: i % 2 === 0 ? ValuationType.Residential : ValuationType.Commercial,
        // valuationType:
        //   i % 2 === 0 ? ValuationType.Commercial : ValuationType.Residential,
        usage: 'RETAIL',
        valuerComments: faker.lorem.paragraph(4),
        valuationDone: true,
        userId: eugene.id,
        companyId: company.id,
        coverImageId: 'g3wu8pjsrhfhgpq67wab',
        images: {
          create: [{ imageId: 'jziexpkkzdjds12kcofo' }],
        },
        clients: {
          create: {
            clientType: faker.lorem.word(),
            postalAddress: faker.lorem.word(),
            phyAddress: faker.lorem.word(),
            email: faker.lorem.word(),
            telephone: faker.lorem.word(),
            firstName: faker.lorem.word(),
            lastName: faker.lorem.word(),
          },
        },
        valuers: {
          create: {
            firstName: faker.lorem.word(),
            lastName: faker.lorem.word(),
            practicingCertificate: faker.lorem.word(),
            practicingCertificateNum: faker.number.int().toString(),
            postalAddress: faker.lorem.word(),
            physicalAddress: faker.lorem.word(),
            email: faker.lorem.word(),
            telephone: faker.lorem.word(),
            firm: faker.lorem.word(),
            declaration: false,
          },
        },
        parkingRecords: {
          create: parkingTypeIds.map((parkingTypeId) => ({
            parkingTypeId,
            unitPerClient: faker.number.int(100),
            ratePerClient: faker.number.float({ precision: 0.01 }),
            unitPerMarket: faker.number.int(100),
            ratePerMarket: faker.number.float({ precision: 0.01 }),
          })),
        },
        outgoingRecords: {
          create: outgoingIdentifiers.map(([identifier, itemType]) => ({
            identifier,
            itemType,
            unitPerClient: 0,
            ratePerClient: 0,
            unitPerMarket: 0,
            ratePerMarket: 0,
          })),
        },
        insuranceRecords: {
          create: insuranceItemIds.map((itemId) => ({
            itemId,
            roofTypeId: itemId === shopInsuranceItem.id ? roofTypeIds[0] : undefined,
            rate: faker.number.float({ precision: 0.01 }),
          })),
        },
        grcRecords: {
          create: [...Array(3).keys()].map((_) => ({
            identifier: faker.lorem.word(),
            unit: 'SQM',
            size: faker.number.int(500),
            rate: faker.number.int(5_000),
          })),
        },
        grcFeeRecords: {
          create: [
            {
              identifier: GrcFeeType.Professional,
              perc: GrcFeeTypePercs[GrcFeeType.Professional],
            },
            {
              identifier: GrcFeeType.Contigencies,
              perc: GrcFeeTypePercs[GrcFeeType.Contigencies],
            },
            {
              identifier: GrcFeeType.Statutory,
              perc: GrcFeeTypePercs[GrcFeeType.Statutory],
            },
          ].map(({ identifier, perc }) => ({
            identifier,
            perc,
          })),
        },
        grcDeprRecords: {
          create: ['Total Developments'].map((identifier) => ({
            identifier,
            perc: 10,
          })),
        },
        mvRecords: {
          create: [...Array(3).keys()].map((_) => ({
            identifier: faker.number.int({ min: 10_000, max: 100_000 }).toString(),
            size: faker.number.int(1_000),
            date: faker.date.recent(),
            location: faker.location.city(),
            price: faker.number.int(5_000_000),
          })),
        },
      },
    });
    for (let propertyTypeId of propertyTypeIds) {
      await prisma.tenant.create({
        data: {
          plotId: plot.id,
          name: faker.company.name(),
          termOfLease: '',
          startDate: faker.date.past(),
          endDate: faker.date.future(),
          grossMonthlyRental: faker.finance.amount(2_500, 10_000, 2),
          escalation: faker.number.int(100),
          propertyTypeId,
          areaPerClient: faker.number.int(400),
          areaPerMarket: faker.number.int(400),
          grossRatePerValuer: faker.number.int(100),
        },
      });
    }
    console.log('...');
  }

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
