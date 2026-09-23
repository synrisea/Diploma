using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordChangeRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasPassword",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(@"UPDATE ""Users"" SET ""HasPassword"" = true;");
            migrationBuilder.Sql(@"UPDATE ""Users"" SET ""HasPassword"" = false WHERE ""Id"" IN (SELECT ""UserId"" FROM ""ExternalLogins"");");

            migrationBuilder.CreateTable(
                name: "PasswordChangeRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NewPasswordHash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    NewPasswordHashAlgorithm = table.Column<int>(type: "integer", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ReplacesExistingPassword = table.Column<bool>(type: "boolean", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordChangeRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordChangeRequests_TokenHash",
                table: "PasswordChangeRequests",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordChangeRequests_UserId",
                table: "PasswordChangeRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PasswordChangeRequests");

            migrationBuilder.DropColumn(
                name: "HasPassword",
                table: "Users");
        }
    }
}
