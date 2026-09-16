using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailChangeRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmailChangeRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NewEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    OldEmailTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    NewEmailTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    OldEmailConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NewEmailConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailChangeRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeRequests_NewEmailTokenHash",
                table: "EmailChangeRequests",
                column: "NewEmailTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeRequests_OldEmailTokenHash",
                table: "EmailChangeRequests",
                column: "OldEmailTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeRequests_UserId",
                table: "EmailChangeRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailChangeRequests");
        }
    }
}
