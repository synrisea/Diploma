using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Connections.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceTimeBucketWithVisitDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "VisitDate",
                table: "VisitIntents",
                type: "date",
                nullable: false,
                defaultValueSql: "CURRENT_DATE");

            migrationBuilder.Sql(
                @"UPDATE ""VisitIntents"" SET ""VisitDate"" = (""ExpiresAt"" AT TIME ZONE 'UTC')::date - 1");

            migrationBuilder.DropColumn(
                name: "TimeBucket",
                table: "VisitIntents");

            migrationBuilder.CreateIndex(
                name: "IX_VisitIntents_VisitDate",
                table: "VisitIntents",
                column: "VisitDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VisitIntents_VisitDate",
                table: "VisitIntents");

            migrationBuilder.DropColumn(
                name: "VisitDate",
                table: "VisitIntents");

            migrationBuilder.AddColumn<string>(
                name: "TimeBucket",
                table: "VisitIntents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }
    }
}
