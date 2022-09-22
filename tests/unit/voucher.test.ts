import voucherRepository from "../../src/repositories/voucherRepository";
import voucherService from "../../src/services/voucherService";
import { faker } from "@faker-js/faker";
import prisma from "../../src/config/database";

beforeEach(() => {
    prisma.$executeRaw`TRUNCATE TABLE vouchers`;
});

describe("Testa service createVoucher", () => {
    it("Testa com code não existente no banco de dados -> deve criar o novo voucher", async () => {
        jest.spyOn(
            voucherRepository,
            "getVoucherByCode"
        ).mockImplementationOnce((): any => {
            return null;
        });

        jest.spyOn(voucherRepository, "createVoucher").mockImplementationOnce(
            (): any => {
                return null;
            }
        );

        const code = faker.lorem.words(3);
        const discount = 10;
        await voucherService.createVoucher(code, discount);
        expect(voucherRepository.createVoucher).toBeCalledTimes(1);
    });

    it("Testa com code existente no banco de dados -> deve retornar 409", async () => {
        jest.spyOn(
            voucherRepository,
            "getVoucherByCode"
        ).mockImplementationOnce((): any => {
            return true;
        });

        const code = faker.lorem.words(3);
        const discount = 10;

        expect(voucherService.createVoucher(code, discount)).rejects.toEqual({
            type: "conflict",
            message: "Voucher already exist.",
        });
    });
});

describe("Testa service applyVoucher", () => {
    it("Testa com voucher inexistente -> deve retornar 409", () => {
        jest.spyOn(
            voucherRepository,
            "getVoucherByCode"
        ).mockImplementationOnce((): any => {
            return false;
        });

        const code = faker.lorem.words(3);
        const amount = faker.datatype.number() + 100;
        expect(voucherService.applyVoucher(code, amount)).rejects.toEqual({
            type: "conflict",
            message: "Voucher does not exist.",
        });
    });

    it("Testa com voucher existente e valor inválido para descontos -> deve retornar objeto com amount = finalAmount", async () => {
        jest.spyOn(
            voucherRepository,
            "getVoucherByCode"
        ).mockImplementationOnce((): any => {
            return true;
        });

        jest.spyOn(
            voucherService,
            "isAmountValidForDiscount"
        ).mockImplementationOnce((): any => {
            return false;
        });

        const code = faker.lorem.words(3);
        const amount = 99;

        const result = await voucherService.applyVoucher(code, amount);

        expect(result).toBeInstanceOf(Object);
        expect(result.amount).toBe(result.finalAmount);
        expect(result.applied).toBe(false);
    });

    it("Testa com voucher usado e valor válido para descontos -> deve retornar objeto com amount = finalAmount", async () => {
        jest.spyOn(
            voucherRepository,
            "getVoucherByCode"
        ).mockImplementationOnce((): any => {
            return {
                id: 1,
                code: faker.lorem.words(3),
                discount: 10,
                used: true,
            };
        });

        jest.spyOn(
            voucherService,
            "isAmountValidForDiscount"
        ).mockImplementationOnce((): any => {
            return true;
        });

        const code = faker.lorem.words(3);
        const amount = 101;

        const result = await voucherService.applyVoucher(code, amount);

        expect(result).toBeInstanceOf(Object);
        expect(result.amount).toBe(result.finalAmount);
        expect(result.applied).toBe(false);
    });

    it("Testa com voucher não usado e valor válido para descontos -> deve retornar objeto com amount != finalAmount", async () => {
        const discount = 10;
        const code = faker.lorem.words(3);
        const amount = 101;
        const expectedAmount = amount - amount * (discount / 100);

        jest.spyOn(
            voucherRepository,
            "getVoucherByCode"
        ).mockImplementationOnce((): any => {
            return {
                id: 1,
                code: faker.lorem.words(3),
                discount,
                used: false,
            };
        });

        jest.spyOn(
            voucherService,
            "isAmountValidForDiscount"
        ).mockImplementationOnce((): any => {
            return true;
        });

        jest.spyOn(
            voucherService,
            "changeVoucherToUsed"
        ).mockImplementationOnce((): any => {
            return;
        });

        jest.spyOn(voucherService, "applyDiscount").mockImplementationOnce(
            (): any => {
                return;
            }
        );

        jest.spyOn(voucherRepository, "useVoucher").mockImplementationOnce(
            (): any => {
                return;
            }
        );

        const result = await voucherService.applyVoucher(code, amount);

        expect(result).toBeInstanceOf(Object);
        expect(result.finalAmount).toBe(expectedAmount);
        expect(result.applied).toBe(true);
    });
});
