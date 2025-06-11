import type { Password, User } from '@prisma/client';

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

import { sendVerificationEmail } from './emails.server';
import { EventAction, EventDomain } from './events';
import { redirect } from '@remix-run/node';
import { AppLinks } from './links';
import { Toaster, toast } from 'sonner';
import { randomInt, randomUUID } from 'node:crypto';
import { GrcFeeType, GrcFeeTypePercs } from './plots.validations';
import { Email } from 'read-excel-file';
require('dotenv').config();
export type { User } from '@prisma/client';

export async function getUserById(id: User['id']) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User['email']) {
  return prisma.user.findUnique({ where: { email } });
}

export function createHashedPassword(password: string) {
  return bcrypt.hash(password, 10);
}

const RandomInteger = () => {
  const getRandomInteger = () => {
    const min = 0;
    const max = Math.pow(10, 10) - 1; // 10^10 - 1 = 9999999999
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  return (
    getRandomInteger
  );
};

export async function CreateInstruction(
  props: {

    createdById: string;
    plotNum: string;
    neighbourhood: string;
    location: string;
    postalAddress: string;
    postalCode: string;
    phyAddress: string;
    email: string;
    telephone: string;
    companyName: string;
    position: string;
    firstName: string;
    lastName: string;
    title: string;
    repEmail: string;
    repPhone: string;
    message: string;
    messageBody: string;
    approvedById: string;
    userId: string;
    plotExtent: number;
    classification: string;
    titleDeedNum: string;
    titleDeedDate: Date;
    valuationType: string;
    companyId: string;

    noteId: string;
    approved: boolean;
    clientType: string;
    valuationKind: string;

  },
  currentUserId: string,
) {
  const { createdById, plotNum, neighbourhood, location, postalAddress, postalCode, phyAddress, email, telephone, companyName, position,
    firstName, lastName, title, repEmail, repPhone, message, messageBody, approvedById, userId,
    plotExtent, classification, titleDeedNum, titleDeedDate, valuationType, companyId, noteId, approved, clientType, valuationKind } = props;

  const compName = await prisma.company.findFirst({
    where: { id: companyId },
    select: { CompanyName: true }
  });

  const verToken = faker.string.uuid();

  const usrEmail = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      UserGroup: {
        select: {
          company: {
            select: {
              CompanyName: true,
            }
          }
        }
      }
    }
  });

  if (!usrEmail || !usrEmail.email) {
    throw new Error('User email not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const numDupl = await prisma.plot.count({
      where: { plotNumber: plotNum },
    });

    let plot;
    if (numDupl) {
      toast.message("Property with Plot number " + plotNum + " already exists, now updating...");

      plot = await tx.plot.update({
        where: { plotNumber: plotNum },
        data: {
          valuer: userId,
          plotExtent,
          address: plotNum + ', ' + neighbourhood + ', ' + location,
          zoning: classification,
          classification,
          usage: classification,
          propertyLocation: location,
          valuationType,
          titleDeedDate,
          titleDeedNum,
          companyId,
          userId,
          globalId: '',
          ZoneValue: '',
        }
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Update,
          recordId: plot.id,
          recordData: JSON.stringify(plot),
        },
      });
    } else {
      plot = await tx.plot.create({
        data: {
          propertyId: randomInt(9999999),
          plotNumber: plotNum,
          valuer: userId,
          plotExtent,
          address: plotNum + ', ' + neighbourhood + ', ' + location,
          zoning: classification,
          classification,
          usage: classification,
          propertyLocation: location,
          valuationType,
          titleDeedDate,
          titleDeedNum,
          companyId,
          userId,
          council: true,
          globalId: '',
          ZoneValue: '',
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
            ],
          },
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Plot,
          action: EventAction.Create,
          recordId: plot.id,
          recordData: JSON.stringify(plot),
        },
      });




      const notification = await tx.notification.create({
        data: {
          noteId,
          plotNum,
          neighbourhood,
          location,
          phyAddress: plotNum + ', ' + neighbourhood + ', ' + location,
          clientType,
          valuationKind,
          companyName,
          email,
          firstName,
          lastName,
          position,
          postalAddress,
          postalCode,
          repEmail,
          repPhone,
          telephone,
          title,
          message,
          messageBody,
          userId,
          createdById,
          approved,
          approvedById,
          approvedDate: new Date(),
          plotId: plot.id
        },
      });

      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Notification,
          action: EventAction.Create,
          recordId: notification.noteId,
          recordData: JSON.stringify(notification),
        },
      });

      return { plot, notification };
    }
  }, {
    timeout: 10000, // Increase the timeout to 10 seconds
  });

  if (result instanceof Error) {
    throw result;
  }

  // Send email to the valuer
  const err = await sendVerificationEmail(usrEmail?.email, verToken, 'cm87p3fz2009tb1dxrj6xp35r', usrEmail.firstName + ' ' + usrEmail.lastName, firstName + ' ' + lastName, plotNum, process.env.WEB_URL + 'notifications/' + noteId + '/edit', repPhone || telephone, compName?.CompanyName, usrEmail?.UserGroup?.company.CompanyName);
  if (err) {
    throw err;
  }

  // Send email to the owner of the property
  const clientEmail = await sendVerificationEmail(email || email, verToken, 'cm87qkxz800d9o47t0spuqozv', usrEmail.firstName + ' ' + usrEmail.lastName, firstName + ' ' + lastName, plotNum, '', '', usrEmail.UserGroup?.company.CompanyName, usrEmail?.UserGroup?.company.CompanyName);
  if (clientEmail) {
    throw clientEmail;
  }

  toast.success("Instruction successfully sent to " + usrEmail?.firstName + " " + usrEmail?.lastName);

  return redirect(AppLinks.EditInstructions(noteId));
}


// EDIT AN INSTRUCTION RECORD
export async function EditInstruction(
  props: {
    noteId: string;
    message: string;
    userId: string;
    firstName: string;
    lastName: string;
    postalAddress: string;
    email: string;
    plotExtent: number;
    classification: string;
    titleDeedNum: string;
    titleDeedDate: Date;
    valuationType: string;
    companyId: string;
    location: string;
    telephone: string;
    createdById: string;
    plotNum: string;
    neighbourhood: string;
    postalCode: string;
    phyAddress: string;
    clientType: string;
    companyName: string;
    position: string;
    title: string;
    repEmail: string;
    repPhone: string;
    messageBody: string;
    approved: boolean;
    approvedById: string;
    valuationKind: string;

  },
  currentUserId: string,
) {

  const { noteId, message, userId, firstName, lastName, postalAddress, email, plotExtent, classification, titleDeedNum,
    titleDeedDate, valuationType, companyId, location, telephone, createdById, plotNum, neighbourhood, postalCode,
    phyAddress, clientType, companyName, position, title, repEmail, repPhone, messageBody, approved, approvedById, valuationKind
  } = props;

  const result = await prisma.$transaction(async (tx) => {

    console.log("Start notification Update");
    const notification = await tx.notification.update({
      where: { noteId },
      data: {
        message, userId, firstName, lastName, postalAddress, email,
        location, telephone, createdById, plotNum, neighbourhood, postalCode,
        phyAddress, clientType, companyName, position, title, repEmail, repPhone, messageBody, approved, approvedById, valuationKind
      },
    });
    await tx.event.create({
      data: {
        userId: currentUserId,
        domain: EventDomain.Notification,
        action: EventAction.Create,
        recordId: notification.noteId,
        recordData: JSON.stringify(notification),
      },
    });

    // Also update related Plot details
    const plot = await tx.plot.update({
      where: { plotNumber: plotNum },
      data: {
        valuer: userId,
        plotNumber: plotNum,
        plotExtent,
        address: plotNum + ', ' + neighbourhood + ', ' + location,
        zoning: classification,
        classification,
        usage: classification,
        propertyLocation: location,
        valuationType,
        titleDeedDate,
        titleDeedNum,
        companyId,
        userId,
        globalId: '',
        ZoneValue: '',
      }
    });
    await tx.event.create({
      data: {
        userId: currentUserId,
        domain: EventDomain.Plot,
        action: EventAction.Update,
        recordId: plot.id,
        recordData: JSON.stringify(plot),
      },
    });
    console.log("Completed notification Update");

    toast.success("Insturction Successfully Updated");


    return redirect(AppLinks.EditInstructions(noteId));
  });
  if (result instanceof Error) {
    throw result;
  }
  return result;
}

// TRANSFER AN INSTRUCTION RECORD
export async function TransferInstruction(
  props: {
    noteId: string;
    message: string;
    userId: string;
    firstName: string;
    lastName: string;
    postalAddress: string;
    email: string;
    plotExtent: number;
    classification: string;
    titleDeedNum: string;
    titleDeedDate: Date;
    valuationType: string;
    companyId: string;
    location: string;
    telephone: string;
    createdById: string;
    plotNum: string;
    neighbourhood: string;
    postalCode: string;
    phyAddress: string;
    clientType: string;
    companyName: string;
    position: string;
    title: string;
    repEmail: string;
    repPhone: string;
    messageBody: string;
    approved: boolean;
    approvedById: string;
    valuationKind: string;

  },
  currentUserId: string,
) {

  const { noteId, message, userId, firstName, lastName, postalAddress, email, plotExtent, classification, titleDeedNum,
    titleDeedDate, valuationType, companyId, location, telephone, createdById, plotNum, neighbourhood, postalCode,
    phyAddress, clientType, companyName, position, title, repEmail, repPhone, messageBody, approved, approvedById, valuationKind
  } = props;

  const compName = await prisma.company.findFirst({
    where: { id: companyId },
    select: { CompanyName: true }
  });

  const getPlotId = await prisma.notification.findFirst({
    where: { noteId },
    select: { plotId: true }
  });
  if (!getPlotId) {
    throw new Error('Plot ID not found');
  }

  const result = await prisma.$transaction(async (tx) => {

    console.log("Start notification Transfer");

    const notification = await tx.notification.create({
      data: {
        updatedAt: new Date(),
        plotNum,
        neighbourhood,
        location,
        phyAddress: plotNum + ', ' + neighbourhood + ', ' + location,
        clientType,
        companyName,
        email,
        firstName,
        lastName,
        position,
        postalAddress,
        postalCode,
        repEmail,
        repPhone,
        telephone,
        title,
        message,
        messageBody,
        userId,
        createdById,
        approved,
        approvedById,
        approvedDate: new Date(),
        plotId: getPlotId.plotId,
        valuationKind
      },
    });

    await tx.event.create({
      data: {
        userId: currentUserId,
        domain: EventDomain.Notification,
        action: EventAction.Create,
        recordId: notification.noteId,
        recordData: JSON.stringify(notification),
      },
    });

    // Find existing attachments and update them with the new notificationId
    const notificationRec = await tx.notification.findUnique({
      where: { noteId: notification.noteId },
    });

    if (!notificationRec) {
      throw new Error(`Notification with noteId ${notification.noteId} does not exist.`);
    }

    // Find existing attachments
    const attachments = await tx.attachment.findMany({
      where: { notificationId: noteId },
    });

    // Update all attachments with the new notificationId
    await Promise.all(
      attachments.map((attachment) =>
        tx.attachment.update({
          where: { id: attachment.id },
          data: { notificationId: notification.noteId },
        })
      )
    );

    // Also update related Plot details
    const plot = await tx.plot.update({
      where: { plotNumber: plotNum },
      data: {
        valuer: userId,
        plotNumber: plotNum,
        plotExtent,
        address: plotNum + ', ' + neighbourhood + ', ' + location,
        zoning: classification,
        classification,
        usage: classification,
        propertyLocation: location,
        valuationType,
        titleDeedDate,
        titleDeedNum,
        companyId,
        userId,
        globalId: '',
        ZoneValue: '',
      }
    });
    await tx.event.create({
      data: {
        userId: currentUserId,
        domain: EventDomain.Plot,
        action: EventAction.Update,
        recordId: plot.id,
        recordData: JSON.stringify(plot),
      },
    });
    console.log("Completed notification Update");

    const verToken = faker.string.uuid();

    const usrEmail = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        UserGroup: {
          select: {
            company: {
              select: {
                CompanyName: true,
              }
            }
          }
        }
      }
    });

    if (!usrEmail || !usrEmail.email) {
      throw new Error('User email not found');
    }
    // Send email to the valuer
    const err = await sendVerificationEmail(usrEmail?.email, verToken, 'cm87p3fz2009tb1dxrj6xp35r', usrEmail.firstName + ' ' + usrEmail.lastName, firstName + ' ' + lastName, plotNum, process.env.WEB_URL + 'notifications/' + noteId + '/edit', repPhone || telephone, compName?.CompanyName, usrEmail?.UserGroup?.company.CompanyName);
    if (err) {
      throw err;
    }

    // Send email to the owner of the property
    const clientEmail = await sendVerificationEmail(email || email, verToken, 'cm87qkxz800d9o47t0spuqozv', usrEmail.firstName + ' ' + usrEmail.lastName, firstName + ' ' + lastName, plotNum, '', '', usrEmail.UserGroup?.company.CompanyName, usrEmail?.UserGroup?.company.CompanyName);
    if (clientEmail) {
      throw clientEmail;
    }


    return redirect(AppLinks.Instructions);
  });

  if (result instanceof Error) {
    throw result;
  }
  return result;
}

export async function deleteUserByEmail(email: User['email']) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(email: User['email'], password: Password['hash']) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: { password: true },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }
  if (userWithPassword.isSuspended || !userWithPassword.isVerified) {
    return null;
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password.hash);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
